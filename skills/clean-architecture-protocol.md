# Skill: Clean Architecture Orchestrator
**Version**: 1.0.0
**Author**: Antigravity Senior Engineering Protocol
**Description**: Enforces production-grade Clean Architecture and SOLID principles during system design and implementation.

---

## 🎯 Core Objectives
- Ensure strict **Separation of Concerns**.
- Enforce **Inward Dependency Flow** (Frameworks depend on Domain, not vice-versa).
- Maintain **Production-Level Standards** (Error handling, validation, security).
- Prioritize **Scalability and Maintainability**.

---

## 🛠️ Implementation Protocol

### 1. Layered Structure Enforcement
When tasked with building or modifying a system, follow this directory and logic hierarchy:

#### 🟢 Domain Layer (`src/domain`)
- **Entities**: Define core business objects (Classes/Interfaces). No logic related to databases or UI.
- **Value Objects**: Immutable objects that represent business concepts.
- **Repository Interfaces**: Define the contracts that the Infrastructure layer must implement.
- **Logic**: Only business-critical rules (e.g., "An evacuation center cannot exceed 100% capacity").

#### 🟡 Application Layer (`src/application`)
- **Use Cases**: Orchestrate data flow to/from entities and repositories.
- **DTOS**: Data Transfer Objects for input/output validation.
- **Exceptions**: Domain-specific error handling.
- **Rule**: This layer must not know *how* data is stored or *how* it is displayed.

#### 🔵 Infrastructure Layer (`src/infrastructure`)
- **Repositories**: Concrete implementations of Domain interfaces (e.g., `SupabaseRepository`).
- **External Services**: API clients, Logger implementations, SMS/Email gateways.
- **Framework Config**: Supabase clients, Prisma/Drizzle setups.

#### 🔴 Presentation Layer (`src/app` | `src/presentation`)
- **UI Components**: React/Next.js components.
- **Styling**: Premium "Tactical Command" Vanilla CSS (Glassmorphism, HSL).
- **Controllers/Routes**: Handle HTTP requests and map them to Use Cases.

---

## 📝 Coding Standards

### SOLID Principles
1. **S**ingle Responsibility: One class/function, one reason to change.
2. **O**pen/Closed: Entities open for extension, closed for modification.
3. **L**iskov Substitution: Subtypes must be substitutable for base types.
4. **I**nterface Segregation: Clients shouldn't depend on methods they don't use.
5. **D**ependency Inversion: Depend on abstractions, not concretions.

### Documentation Requirements
- **Intent Over Behavior**: Comments should explain *why* something exists, not just *what* it does.
- **Layer Context**: Every major block should specify which layer it belongs to and why.

---

## 🚀 Execution Workflow
1. **Understand**: Analyze requirements against business rules.
2. **Model**: Create Domain Entities and Interfaces first.
3. **Orchestrate**: Implement Use Cases in the Application layer.
4. **Integrate**: Write concrete Infrastructure implementations.
5. **Visualize**: Build the UI/Presentation layer with premium aesthetics.
6. **Audit**: Run a "Clean Architecture Scan" to ensure no dependency leaks.
