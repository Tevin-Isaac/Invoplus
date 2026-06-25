/**
 * CIP-103 dApp Provider Implementation
 * 
 * This implements the CIP-103 standard for Canton wallet interoperability.
 * It provides a vendor-neutral interface for dApps to interact with Canton wallets.
 * 
 * Based on: https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md
 * 
 * This implementation supports:
 * - Synchronous dApp API (for browser extensions/local wallets)
 * - Asynchronous dApp API (for server-side/remote wallets)
 * - Provider API (EIP-1193 compatible)
 */

// ============================================================================
// Type Definitions (from CIP-103 specification)
// ============================================================================

type EventListener<T> = (...args: T[]) => void

type RequestParams = unknown[] | Record<string, unknown>

interface RequestPayload {
  method: string
  params?: RequestParams
}

// Provider API (EIP-1193 compatible)
interface Provider {
  request<T>(args: RequestPayload): Promise<T>
  on<T>(event: string, listener: EventListener<T>): Provider
  emit<T>(event: string, ...args: T[]): boolean
  removeListener<T>(event: string, listenerToRemove: EventListener<T>): Provider
}

// Error types (EIP-1474 compatible)
interface ProviderRpcError extends Error {
  message: string
  code: number
  data?: unknown
}

// CIP-103 Error Codes
enum ErrorCode {
  USER_REJECTED = 4001,
  UNAUTHORIZED = 4100,
  UNSUPPORTED_METHOD = 4200,
  DISCONNECTED = 4900,
  CHAIN_DISCONNECTED = 4901,
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  INVALID_INPUT = -32000,
  RESOURCE_NOT_FOUND = -32001,
  RESOURCE_UNAVAILABLE = -32002,
  TRANSACTION_REJECTED = -32003,
  METHOD_NOT_SUPPORTED = -32004,
  LIMIT_EXCEEDED = -32005,
}

// CIP-103 Types
interface ConnectResult {
  isConnected: boolean
  reason?: string
  isNetworkConnected?: boolean
  networkReason?: string
}

interface ProviderInfo {
  id: string
  version: string
  providerType: 'browser' | 'desktop' | 'mobile' | 'remote'
}

interface Network {
  networkId: string // CAIP-2 compliant, e.g., "canton:da-mainnet"
  ledgerApi?: string
  accessToken?: string
}

interface Session {
  accessToken: string
  userId: string
}

interface StatusEvent {
  connection: ConnectResult
  provider: ProviderInfo
  network?: Network
  session?: Session
}

interface Account {
  primary: boolean
  partyId: string
  status: 'initializing' | 'allocated'
  hint: string
  publicKey: string
  namespace: string
  networkId: string
  signingProviderId: string
}

interface AccountsChangedEvent {
  accounts: Account[]
}

interface TxChangedPendingEvent {
  status: 'pending'
  commandId: string
}

interface TxChangedSignedEvent {
  status: 'signed'
  commandId: string
  payload: {
    signature: string
    signedBy: string
    party: string
  }
}

interface TxChangedExecutedEvent {
  status: 'executed'
  commandId: string
  payload: {
    updateId: string
    completionOffset: number
  }
}

interface TxChangedFailedEvent {
  status: 'failed'
  commandId: string
}

type TxChangedEvent = 
  | TxChangedPendingEvent 
  | TxChangedSignedEvent 
  | TxChangedExecutedEvent 
  | TxChangedFailedEvent

interface LedgerApiRequest {
  requestMethod: 'get' | 'post' | 'put' | 'delete' | 'patch'
  resource: string
  path?: object
  query?: object
  body?: object
  headers?: object
}

type LedgerApiResponse = object

// ============================================================================
// CIP-103 Provider Implementation
// ============================================================================

class Cip103Provider implements Provider {
  private eventListeners: Map<string, Set<EventListener<unknown>>> = new Map()
  private _isConnected: boolean = false
  private _accounts: Account[] = []
  private _network: Network | null = null
  private _session: Session | null = null
  private _providerInfo: ProviderInfo = {
    id: 'invoplus-cip103',
    version: '1.0.0',
    providerType: 'remote', // Default to remote for server-side wallets
  }

  constructor(private walletUrl?: string) {
    // Initialize with wallet URL if provided (for async dApp API)
    if (walletUrl) {
      this._providerInfo.providerType = 'remote'
    }
  }

  // ============================================================================
  // Provider API Methods (EIP-1193)
  // ============================================================================

  async request<T>(args: RequestPayload): Promise<T> {
    const { method, params } = args

    try {
      switch (method) {
        case 'connect':
          return await this.connect(params as any) as T
        case 'disconnect':
          return await this.disconnect() as T
        case 'isConnected':
          return await this.isConnected() as T
        case 'status':
          return await this.status() as T
        case 'getActiveNetwork':
          return await this.getActiveNetwork() as T
        case 'listAccounts':
          return await this.listAccounts() as T
        case 'getPrimaryAccount':
          return await this.getPrimaryAccount() as T
        case 'signMessage':
          return await this.signMessage(params as any) as T
        case 'prepareExecute':
          return await this.prepareExecute(params as any) as T
        case 'ledgerApi':
          return await this.ledgerApi(params as any) as T
        default:
          throw this.createError(ErrorCode.METHOD_NOT_FOUND, `Method not found: ${method}`)
      }
    } catch (error) {
      if (error instanceof ProviderRpcError) {
        throw error
      }
      throw this.createError(ErrorCode.INTERNAL_ERROR, `Internal error: ${error}`)
    }
  }

  on<T>(event: string, listener: EventListener<T>): Provider {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener as EventListener<unknown>)
    return this
  }

  emit<T>(event: string, ...args: T[]): boolean {
    const listeners = this.eventListeners.get(event)
    if (!listeners) return false
    
    listeners.forEach(listener => {
      try {
        listener(...args)
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error)
      }
    })
    return true
  }

  removeListener<T>(event: string, listenerToRemove: EventListener<T>): Provider {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listenerToRemove as EventListener<unknown>)
    }
    return this
  }

  // ============================================================================
  // dApp API Methods
  // ============================================================================

  /**
   * Establishes a connection to the wallet
   * For async API, may return a userUrl for login flow
   */
  async connect(params?: { userUrl?: string }): Promise<ConnectResult | { userUrl: string }> {
    // If this is a remote wallet with async API, return userUrl
    if (this._providerInfo.providerType === 'remote' && this.walletUrl) {
      // In a real implementation, this would initiate the login flow
      // and return a userUrl for the user to complete authentication
      return {
        userUrl: `${this.walletUrl}/login?redirect=${encodeURIComponent(window.location.href)}`
      }
    }

    // For sync API, perform direct connection
    this._isConnected = true
    
    // Emit statusChanged event
    this.emit('statusChanged', await this.status())
    
    return {
      isConnected: true,
      isNetworkConnected: true,
    }
  }

  /**
   * Closes the connection to the wallet
   */
  async disconnect(): Promise<void> {
    this._isConnected = false
    this._accounts = []
    this._network = null
    this._session = null
    
    // Emit statusChanged event
    this.emit('statusChanged', await this.status())
  }

  /**
   * Checks if connected without initiating login
   */
  async isConnected(): Promise<ConnectResult> {
    return {
      isConnected: this._isConnected,
      isNetworkConnected: this._isConnected,
    }
  }

  /**
   * Returns the current status of the provider
   */
  async status(): Promise<StatusEvent> {
    return {
      connection: await this.isConnected(),
      provider: this._providerInfo,
      network: this._network || undefined,
      session: this._session || undefined,
    }
  }

  /**
   * Returns the active network
   */
  async getActiveNetwork(): Promise<Network> {
    if (!this._network) {
      throw this.createError(ErrorCode.CHAIN_DISCONNECTED, 'No network connected')
    }
    return this._network
  }

  /**
   * Lists all accounts available to the user
   */
  async listAccounts(): Promise<Account[]> {
    if (!this._isConnected) {
      throw this.createError(ErrorCode.UNAUTHORIZED, 'Not connected to wallet')
    }
    return this._accounts
  }

  /**
   * Returns the primary account
   */
  async getPrimaryAccount(): Promise<Account> {
    const primary = this._accounts.find(acc => acc.primary)
    if (!primary) {
      throw this.createError(ErrorCode.RESOURCE_NOT_FOUND, 'No primary account found')
    }
    return primary
  }

  /**
   * Signs an arbitrary message
   */
  async signMessage(params: { message: string }): Promise<string> {
    if (!this._isConnected) {
      throw this.createError(ErrorCode.UNAUTHORIZED, 'Not connected to wallet')
    }

    const { message } = params
    
    // In a real implementation, this would prompt the user to sign
    // For now, we'll simulate signing
    const primaryAccount = await this.getPrimaryAccount()
    
    // Simulate signature (in production, this would use the wallet's signing capability)
    const signature = `signed_${primaryAccount.partyId}_${Buffer.from(message).toString('base64').slice(0, 16)}`
    
    return signature
  }

  /**
   * Prepares, signs, and executes commands on the ledger
   */
  async prepareExecute(params: unknown): Promise<void> {
    if (!this._isConnected) {
      throw this.createError(ErrorCode.UNAUTHORIZED, 'Not connected to wallet')
    }

    // In a real implementation, this would:
    // 1. Prepare the command
    // 2. Prompt user for approval
    // 3. Sign the command
    // 4. Execute on the ledger
    // 5. Emit txChanged events throughout the process

    // Emit pending event
    const commandId = `cmd_${Date.now()}`
    this.emit('txChanged', { status: 'pending', commandId } as TxChangedPendingEvent)

    // Simulate signing
    this.emit('txChanged', { 
      status: 'signed', 
      commandId,
      payload: {
        signature: 'simulated_signature',
        signedBy: (await this.getPrimaryAccount()).partyId,
        party: (await this.getPrimaryAccount()).partyId,
      }
    } as TxChangedSignedEvent)

    // Simulate execution
    this.emit('txChanged', {
      status: 'executed',
      commandId,
      payload: {
        updateId: `update_${Date.now()}`,
        completionOffset: 1,
      }
    } as TxChangedExecutedEvent)
  }

  /**
   * Proxies requests to the Ledger API
   */
  async ledgerApi(params: LedgerApiRequest): Promise<LedgerApiResponse> {
    if (!this._isConnected) {
      throw this.createError(ErrorCode.UNAUTHORIZED, 'Not connected to wallet')
    }

    if (!this._network?.ledgerApi) {
      throw this.createError(ErrorCode.CHAIN_DISCONNECTED, 'No ledger API endpoint configured')
    }

    const { requestMethod, resource, path, query, body, headers } = params

    // Build the full URL
    let url = `${this._network.ledgerApi}${resource}`
    
    // Replace path parameters
    if (path) {
      Object.entries(path).forEach(([key, value]) => {
        url = `${url.replace(`{${key}}`, String(value))}`
      })
    }

    // Add query parameters
    if (query) {
      const searchParams = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        searchParams.append(key, String(value))
      })
      url += `?${searchParams.toString()}`
    }

    // Make the request
    const response = await fetch(url, {
      method: requestMethod.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this._session?.accessToken || this._network?.accessToken || ''}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      throw this.createError(ErrorCode.INTERNAL_ERROR, `Ledger API request failed: ${response.status}`)
    }

    return response.json()
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Sets the network configuration
   */
  setNetwork(network: Network): void {
    this._network = network
    this.emit('statusChanged', this.status())
  }

  /**
   * Sets the accounts
   */
  setAccounts(accounts: Account[]): void {
    this._accounts = accounts
    this.emit('accountsChanged', { accounts } as AccountsChangedEvent)
  }

  /**
   * Sets the session
   */
  setSession(session: Session): void {
    this._session = session
    this.emit('statusChanged', this.status())
  }

  /**
   * Creates a ProviderRpcError
   */
  private createError(code: ErrorCode, message: string): ProviderRpcError {
    const error = new Error(message) as ProviderRpcError
    error.code = code
    error.message = message
    return error
  }
}

// ============================================================================
// Export
// ============================================================================

export { Cip103Provider }
export type {
  Provider,
  RequestPayload,
  ConnectResult,
  ProviderInfo,
  Network,
  Session,
  StatusEvent,
  Account,
  AccountsChangedEvent,
  TxChangedEvent,
  LedgerApiRequest,
  LedgerApiResponse,
}
export { ErrorCode }
