# RFC-0007: Enterprise Security Architecture & Threat Model Specification

**Title:** Collagility Complete Security Architecture Specification (v1.0.0-draft)  
**Author:** Staff Software Architect & Chief Information Security Officer (CISO)  
**Status:** Draft / Proposal  
**Created:** July 2026  
**Security Framework Alignment:** Zero Trust Architecture (NIST SP 800-207), SOC 2 Type II, ISO/IEC 27001, GDPR  

---

## 1. Executive Summary

This document specifies the end-to-end Security Architecture and Threat Model for **Collagility**, the open-source multiplayer workspace for local AI coding agents. 

Because Collagility connects local developer environments across enterprise networks and bridges terminal processes with central event relays, it operates under a strict **Zero Trust Architecture (ZTA)** model: **no network, client, server, or user is inherently trusted**.

The primary security imperative of Collagility is **Local Compute & Credential Sovereignty**: AI model inferencing, source code execution, and AI vendor API credentials remain 100% isolated to the session owner's host machine. The central relay infrastructure acts exclusively as an authenticated, authorized, zero-knowledge event router.

This specification details authentication mechanics, fine-grained access control (ReBAC/ABAC), token lifecycles, WebSocket security, cryptographic envelope protection, rate limiting, anti-replay guards, AI safety filters, tamper-evident audit trails, disaster recovery, and a complete STRIDE threat analysis.

---

## 2. High-Level Security Architecture & Trust Boundaries

```mermaid
graph TB
    subgraph Host Machine ["Trust Zone 1: Local Host Sovereign Compute (Zero Knowledge)"]
        LocalAI["Local AI Agent (Gemini CLI / Claude Code)"]
        HostCLI["Collagility Host CLI Engine"]
        LocalFS["Local Workspace Source Code & Git"]
        LocalKeys["Local AI Vendor Credentials (API Keys)"]

        HostCLI <-->|"IPC / PTY Pipes"| LocalAI
        LocalAI -->|"Accesses Local Secrets"| LocalKeys
        HostCLI <-->|"Reads / Writes"| LocalFS
    end

    subgraph Trust Boundary Alpha ["Trust Boundary Alpha: TLS 1.3 Encryption / Signed WebSocket Frames"]
    end

    subgraph Cloud Control Plane ["Trust Zone 2: Stateless Relay & Control Plane (Multi-Tenant Cloud)"]
        WAGateway["Fastify Edge WSS Gateway"]
        AuthService["Authentication & OIDC Service"]
        RoleGuard["RBAC / ABAC Permission Evaluator"]
        EventRouter["Pub/Sub Event Routing Engine"]
        AuditEngine["Tamper-Evident Audit Logging Engine"]
        RateLimiter["Distributed Token Bucket Rate Limiter"]

        WAGateway --> AuthService
        WAGateway --> RoleGuard
        RoleGuard --> EventRouter
        WAGateway --> RateLimiter
        EventRouter --> AuditEngine
    end

    subgraph Trust Boundary Beta ["Trust Boundary Beta: mTLS / Encrypted Data Storage"]
    end

    subgraph Storage Zone ["Trust Zone 3: Data Tier (Encrypted at Rest)"]
        RedisCluster[("Redis Cluster (Ephemeral State & Rate Limits)")]
        PostgresDB[("PostgreSQL Aurora (Metadata, Audit, Users)")]
        KMS["Cloud Key Management Service (Envelope Encryption Keys)"]
    end

    subgraph Participant Machine ["Trust Zone 4: Remote Participant Terminal / IDE"]
        ParticipantCLI["Collagility Client CLI / Web / IDE"]
    end

    HostCLI <--> TrustBoundaryAlpha
    TrustBoundaryAlpha <--> WAGateway
    ParticipantCLI <--> TrustBoundaryAlpha
    
    CloudControlPlane <--> TrustBoundaryBeta
    TrustBoundaryBeta <--> StorageZone
    StorageZone <--> KMS

    style LocalKeys fill:#f9f,stroke:#333,stroke-width:2px
    style HostCLI fill:#bbf,stroke:#333,stroke-width:2px
    style WAGateway fill:#dfd,stroke:#333,stroke-width:2px
    style KMS fill:#ff9,stroke:#333,stroke-width:2px
```

---

## 3. Data Flow Diagram (DFD) & Threat Surfaces

```mermaid
graph LR
    User["Developer (Host / Participant)"] -->|"1. Auth Request / Credentials"| AuthEndpoint["Authentication Endpoint"]
    AuthEndpoint -->|"2. Issue Signed JWT"| User
    User -->|"3. Connect WebSocket (JWT + Session ID)"| WSGateway["WebSocket Gateway"]
    WSGateway -->|"4. Verify Token & ACL"| AuthGuard["Authorization Guard"]
    AuthGuard -->|"5. Route Event Frame"| EventBus["Pub/Sub Event Bus"]
    EventBus -->|"6. Broadcast Frame"| PeerUser["Remote Peer Terminal"]
    HostCLI["Host CLI Engine"] -->|"7. Stream AI Token Chunk"| WSGateway
    WSGateway -->|"8. Write Audit Event"| AuditStore[("Audit Store")]

    style AuthGuard fill:#ffd2d2,stroke:#333
    style WSGateway fill:#d2ffd2,stroke:#333
```

---

## 4. Authentication Architecture

### 4.1 Authentication Principles & Login Flows
1. **Passwordless & OIDC Federated Identity:** Eliminates static password storage risks. Supports GitHub OAuth2, Google OIDC, and Enterprise SAML 2.0 / Okta / Azure AD.
2. **Device Code Flow (RFC 8628):** Designed specifically for terminal CLI environments (`collagility login`). Generates a short verification code and user authentication URI for browser approval.
3. **Multi-Factor Authentication (MFA):** Enforced at the organization policy level using Time-based One-Time Passwords (TOTP) or FIDO2 / WebAuthn hardware keys.
4. **Device Trust & Binding:** Devices register public key pairs (`Ed25519`) during onboarding. Access tokens are bound to specific hardware device footprints.

### 4.2 Authentication Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor CLI as Developer CLI
    actor Browser as Developer Browser
    participant Server as Auth Server
    participant IdP as Identity Provider (OIDC/SAML)

    CLI->>Server: Request Device Code (RFC 8628)
    Server-->>CLI: Return Device Code + Verification URL
    CLI->>Browser: Open Browser to Verification URL
    Browser->>Server: User Navigates to Auth URL
    Server->>IdP: Redirect to External IdP (OIDC/SAML)
    IdP-->>Browser: Authenticate & Submit MFA
    IdP-->>Server: Return IdP Identity Assertion Token
    Server->>Server: Issue Device Authorization Code
    CLI->>Server: Poll for Token Exchange (Device Code)
    Server-->>CLI: Issue Signed Access Token + Refresh Token
```

---

## 5. Authorization Architecture (RBAC + ABAC + ReBAC)

Collagility enforces a hybrid access control model combining **Role-Based Access Control (RBAC)** for administrative roles, **Attribute-Based Access Control (ABAC)** for dynamic context evaluation (IP range, device trust score, time), and **Relationship-Based Access Control (ReBAC)** for fine-grained workspace graphs.

### 5.1 Permission Evaluation Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Client as Participant Client
    participant Gateway as WebSocket Gateway
    participant PEP as Policy Enforcement Point
    participant PDP as Policy Decision Point
    participant Cache as Policy Cache (Redis)

    Client->>Gateway: Event Frame (ai.request.suggest_prompt)
    Gateway->>PEP: Evaluate Permission Request
    PEP->>Cache: Fetch User Roles & Relationship Graph
    alt Cache Hit
        Cache-->>PEP: Return Cached Policy Decision
    else Cache Miss
        PEP->>PDP: Query ReBAC Graph (User -> Session -> Room Role)
        PDP-->>PEP: Return Policy Decision (ALLOW / DENY)
    end
    alt ALLOW
        PEP-->>Gateway: Forward Event to Target Session
    else DENY
        PEP-->>Gateway: Block Event
        Gateway-->>Client: error.permission_denied { code: 4003 }
    end
```

---

## 6. Scalable Permission Model & Hierarchy

The permission model enforces strict inheritance down the organizational hierarchy, with localized resource overrides.

```mermaid
graph TD
    Org["Organization Level (Owner / Admin / Member)"] --> Team["Team Level (Lead / Contributor)"]
    Team --> Workspace["Workspace Level (Admin / Developer / Viewer)"]
    Workspace --> Session["Session Level (Host / Co-Driver / Observer)"]
    Session --> Document["Resource Level (Read / Write / Executive Approval)"]

    style Org fill:#f9f,stroke:#333,stroke-width:2px
    style Session fill:#bbf,stroke:#333,stroke-width:2px
```

### 6.1 Role Permission Matrix

| Role | Scope | Create Session | Submit Prompts | Approve Commands | Invite Users | Audit Access |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Organization Owner** | Organization | Yes | Yes | Yes | Yes | Full |
| **Workspace Admin** | Workspace | Yes | Yes | Yes | Yes | Workspace |
| **Session Host** | Active Session | Yes (Owner) | Yes | **Exclusive** | Yes | Session |
| **Session Co-Driver** | Active Session | No | Yes (Host Validated) | No | No | Read-Only |
| **Session Observer** | Active Session | No | No (Read Only) | No | No | Read-Only |

---

## 7. Session Management & Token Architecture

### 7.1 Cryptographic Token Strategy
* **Short-Lived Access Tokens:** Cryptographically signed JSON Web Tokens (JWT) using `EdDSA` (`Ed25519`). Expiration: **15 minutes**.
* **Opaque Refresh Tokens:** High-entropy 256-bit cryptographically secure random strings stored as hashed values in PostgreSQL. Expiration: **7 days** with sliding window rotation.
* **Token Rotation & Theft Detection:** Every refresh token exchange revokes the previous token family chain if reuse of an old refresh token is detected (indicating token exfiltration).

```mermaid
stateDiagram-v2
    [*] --> Issued: User Authentication
    Issued --> Active: Access Token Valid (15m)
    Active --> Expired: Time > 15m
    Expired --> Refreshing: Present Refresh Token
    Refreshing --> Issued: Valid Refresh Token (New Pair Issued)
    Refreshing --> Revoked: Invalid / Reused Refresh Token
    Revoked --> [*]: User Forced to Re-authenticate
```

---

## 8. Invite Link Security & Onboarding

1. **High-Entropy Token Generation:** Session invite tokens are 256-bit cryptographically secure strings (`UUIDv4` + HMAC-SHA256 signature).
2. **One-Time & Max-Use Constraints:** Invites enforce configurable use caps (e.g., single-use peer links vs. multi-use team links).
3. **Strict Expiration:** Default expiration is **1 hour** for session join links; unused links automatically purge.
4. **Context-Bound Validation:** Links encode the specific Workspace ID and required role scope, preventing cross-tenant reuse attacks.

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host Developer
    participant Server as Control Plane
    actor Joiner as Participant

    Host->>Server: Generate Invite Link { role: "CO_DRIVER", ttl: "3600s", max_uses: 1 }
    Server-->>Host: Return Signed Invite URI (https://collagility.dev/join?t=HEX_TOKEN)
    Host->>Joiner: Transmit Invite Link (Out of Band)
    Joiner->>Server: Redeem Invite Token
    Server->>Server: Verify Signature, Expiration, and Use Count
    Server-->>Joiner: Issue Scoped Session Token
    Server->>Server: Increment Use Counter (Expire if max_uses reached)
```

---

## 9. Replay Protection Architecture

To prevent malicious interceptors from re-transmitting WebSocket events or REST HTTP requests:

1. **Monotonic Sequence Numbers (`seq`):** Every WebSocket stream event carries an incrementing 64-bit sequence counter scoped to the room. Out-of-order or duplicate sequence numbers are dropped immediately.
2. **Cryptographic Nonces & Timestamps:** REST requests require `X-Signature`, `X-Timestamp`, and `X-Nonce` headers. Requests outside a $\pm 300\text{-second}$ clock window or containing previously seen nonces are rejected.
3. **Ephemerality of Stream Tokens:** AI stream chunks carry ephemeral stream identifiers valid only for the duration of the current execution frame.

---

## 10. WebSocket & Broadcast Security

1. **Origin Header Validation:** Server strictly enforces allowed CORS/Origin domain matching to prevent Cross-Site WebSocket Hijacking (CSWSH).
2. **Connection Authentication:** WebSocket upgrade requests require valid JWT bearer tokens passed via `sec-websocket-protocol` or short-lived connection tickets.
3. **Broadcast Role Isolation:** The pub/sub relay router filters outgoing room channels. Events containing private host diagnostic metrics are stripped before fan-out to Observer participants.

---

## 11. Denial-of-Service (DoS) & Rate Limiting Architecture

Collagility implements a multi-tier distributed rate-limiting architecture powered by Redis sliding-window algorithms.

```mermaid
graph TD
    ClientReq["Incoming Network Traffic"] --> EdgeFilter["Layer 4 / Cloudflare DDoS Shield"]
    EdgeFilter --> RateLimiter["Layer 7 Distributed Rate Limiter (Redis Sliding Window)"]
    
    subgraph Rate Limiting Quotas
        RateLimiter --> AuthQuota["Auth Endpoints: 5 req/min"]
        RateLimiter --> APIQuota["REST API: 100 req/min"]
        RateLimiter --> WSQuota["WebSocket Frames: 50 msg/sec"]
        RateLimiter --> AIQuota["Prompt Suggestions: 10 req/min"]
    end

    AuthQuota -->|Exceeded| Block429["Return 429 Too Many Requests"]
    APIQuota -->|Exceeded| Block429
    WSQuota -->|Exceeded| DropFrame["Close WS Socket (Code 4008)"]
    AIQuota -->|Exceeded| Block429
```

---

## 12. Owner Verification & Sensitive Action Guards

Critical administrative operations (e.g., Workspace Deletion, Transfer Ownership, Billing Changes, Global Security Rule Updates) require **Step-Up Re-Authentication**:

* **Interactive Challenge:** Prompt user for WebAuthn hardware key touch or TOTP code.
* **Dual-Control Approval (Multisig for Enterprise):** Option for high-security workspaces requiring two distinct Organization Owners to approve workspace deletion.

---

## 13. Cryptographic Architecture & Secrets Management

```mermaid
graph TD
    subgraph Envelope Encryption Model
        KMS["Cloud Key Management Service (AWS KMS / GCP KMS)"]
        MasterKey["Root Master Key (KMS Managed)"]
        DEK["Data Encryption Key (DEK - AES-256-GCM)"]
        PayloadData["Sensitive Database Metadata / Audit Logs"]

        MasterKey -->|"Encrypts"| DEK
        DEK -->|"Encrypts"| PayloadData
    end
```

### 13.1 Encryption Standards
* **Data in Transit:** TLS 1.3 enforced across all HTTP/WSS channels. Cipher suites restricted to modern AEAD ciphers (`TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`).
* **Data at Rest:** All databases, caches, and persistent volumes encrypted using AES-256-GCM envelope encryption.
* **Local Secrets Isolation:** Host AI API keys reside solely in local system keychains (macOS Keychain, Linux Secret Service, Windows Credential Manager).

---

## 14. AI Security, Safety & Tenant Isolation

```mermaid
graph TD
    subgraph Host Machine Local Sandbox
        CoDriverInput["Co-Driver Prompt Suggestion"] --> Filter1["Host Prompt Injection Scanner"]
        Filter1 --> HostApproval["Host Manual Confirmation Dialog"]
        HostApproval --> Filter2["Sanitizer & System Prompt Wrapper"]
        Filter2 --> LocalAI["Local AI Agent (Gemini CLI)"]
        LocalAI --> OutputGuard["Tool Call Confirmation Guard"]
        OutputGuard --> LocalOS["Local OS Execution / File System"]
    end
```

1. **Prompt Injection & Jailbreak Defense:** Input prompt suggestions from non-host participants are sanitized and scanned for prompt injection signatures prior to display in the host approval window.
2. **Host Sovereignty & Tool Execution Guard:** The AI agent CANNOT execute terminal commands or write local files without explicit, interactive host confirmation.
3. **Context Isolation:** Participants cannot view workspace files outside the explicit context bundle assembled by the host.

---

## 15. Secure Logging & Tamper-Evident Audit Trail

```mermaid
graph LR
    SystemEvents["System / Security Events"] --> StructLogger["Structured JSON Logger (Pino)"]
    StructLogger --> PIIFilter["PII & Secret Redaction Engine"]
    PIIFilter --> LogStream["Log Aggregator (Vector / Fluentd)"]
    LogStream --> SIEM["SIEM (Elasticsearch / Datadog)"]
    LogStream --> AuditStore[("Immutable Object Storage (WORM / S3 Lock)")]

    style AuditStore fill:#ff9,stroke:#333,stroke-width:2px
```

* **Tamper-Resistance:** Audit logs are written to Write-Once-Read-Many (WORM) cloud storage with cryptographic hash-chaining (HMAC SHA-256 log blocks).
* **Privacy & Redaction:** Automated regex filters scrub passwords, JWT tokens, IP addresses (pseudonymized), and personal secrets before log emission.

---

## 16. Disaster Recovery & Resilience Architecture

| Requirement | Target Metric | Architectural Strategy |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | $< 1\text{ minute}$ | Continuous WAL shipping for PostgreSQL; multi-region Redis replication. |
| **Recovery Time Objective (RTO)** | $< 5\text{ minutes}$ | Automated multi-region DNS failover; stateless Fastify container auto-scaling. |
| **Backup Frequency** | Hourly Incremental, Daily Full | Automated encrypted snapshots replicated to secondary geographic region. |

---

## 17. STRIDE Threat Model & Risk Assessment

```mermaid
graph TD
    subgraph STRIDE Attack Vectors
        S["Spoofing Identity"]
        T["Tampering with Data"]
        R["Repudiation"]
        I["Information Disclosure"]
        D["Denial of Service"]
        E["Elevation of Privilege"]
    end
```

### 17.1 STRIDE Threat Analysis Matrix

| Threat Category | Specific Threat Surface | Impact | Architectural Mitigation Strategy | Risk Rating |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Adversary impersonates host to join session. | High | Cryptographic device binding; JWT signed with EdDSA; short-lived join tokens. | Low |
| **Tampering** | Man-in-the-middle modifies AI stream tokens. | High | TLS 1.3 transport encryption; WebSocket sequence numbers (`seq`); SHA-256 HMACs. | Low |
| **Repudiation** | User denies submitting destructive prompt. | Medium | Tamper-evident, WORM-locked audit trail capturing signed user event IDs. | Low |
| **Information Disclosure** | Relay server compromise leaks code context. | Critical | **Zero-Knowledge Architecture:** Host code context is never stored on backend servers. | Critical (Mitigated to Low) |
| **Denial of Service** | Socket flooding attacks on relay nodes. | Medium | Layer 7 distributed sliding-window rate limiting; Cloudflare DDoS protection. | Medium |
| **Elevation of Privilege** | Observer gains Co-Driver or Host privileges. | High | Server-side ReBAC permission enforcement on every event frame. | Low |

---
