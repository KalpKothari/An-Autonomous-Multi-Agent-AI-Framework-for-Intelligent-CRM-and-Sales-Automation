# RELAY

### AI Sales Agent for Autonomous CRM & Voice-Based Sales Automation

**RELAY** is a full-stack, AI-powered sales automation platform that combines conversational voice AI, intelligent sales workflows, and a centralized Customer Relationship Management (CRM) system.

It transforms customer conversations into structured customer records, actionable sales leads, product recommendations, inventory checks, and purchase workflows — reducing repetitive manual work for sales teams.

> **Core Idea:** The voice agent handles natural customer interaction, while RELAY's backend coordinates business logic, CRM operations, and sales intelligence.

---

## Problem Statement

Traditional sales and CRM workflows often involve:

- Repetitive customer questioning.
- Manual lead creation and updates.
- Delays in checking product availability.
- Disconnected call records and customer information.
- Time-consuming sales administration.
- Inconsistent capture of customer requirements.

Sales teams spend valuable time on repetitive tasks instead of focusing on customer relationships and closing opportunities.

---

## Our Solution

**RELAY** brings together:

- Conversational AI voice interaction.
- Automated customer identification.
- Structured CRM and lead management.
- AI-assisted product recommendations.
- Backend inventory lookups.
- Purchase and invoice workflows.
- Conversation storage and operational logging.
- A centralized dashboard.

**Expected Benefits:**

- Reduced repetitive data entry.
- More consistent customer records.
- Faster access to product information.
- Better continuity between conversations and CRM workflows.
- A foundation for increasingly autonomous sales operations.

---

## Key Features & Functionalities

### 1. AI Voice Sales Agent

The voice agent interacts with customers through natural voice conversations and serves as the entry point for RELAY's sales workflows.

- Understands customer requirements and purchase intent.
- Asks follow-up questions to collect missing information.
- Uses backend tools to access business and product data.
- Supports customer identification and sales workflows during calls.

> **Key Idea:** The voice agent manages communication, while validated backend operations manage business data and decisions.

### 2. Intelligent Customer Identification & CRM

Once customer information is collected, RELAY connects the conversation to the appropriate customer record.

- Finds existing customers using their mobile numbers.
- Creates new customer records when required details are available.
- Maintains customer information in MongoDB.
- Connects customer records with leads and conversations.
- Validates customer information before CRM operations.

**Benefits:**

- Reduces repetitive data entry.
- Helps identify returning customers.
- Keeps customer information connected throughout the sales process.

### 3. Automated Lead Creation & Management

RELAY converts customer purchase requirements into structured sales leads, helping maintain continuity between conversations and sales activities.

- Records product requirements, quantities, budgets, and purchase timelines when available.
- Updates existing leads as customer preferences become clearer.
- Records explicitly selected laptop models against the relevant lead.

### 4. AI-Powered Laptop Recommendation Engine

RELAY uses AI to understand customer requirements expressed in natural language and suggest suitable laptop models.

- Understands laptop requirements expressed in natural language.
- Suggests suitable laptop models based on customer needs.
- Supports use cases such as business, office work, and video editing.
- Supports budget-aware product recommendations.
- Connects recommendations with catalogue and inventory information.

**Example:**

Customer: "I need laptops for professional video editing."

→ RELAY interprets the requirement and recommends relevant laptop options.

> **Key Idea:** AI-assisted recommendations help connect customer requirements with suitable products.

### 5. Inventory & Product Management

RELAY connects product recommendations with catalogue and inventory information so that product availability can be checked through the backend.

- Maintains product and inventory information in the backend.
- Checks availability for requested products.
- Supports quantity-based stock checks.
- Connects product recommendations with inventory information.

**Benefits:**

- Faster access to stock information.
- Less manual inventory checking.
- Better alignment between customer requirements and product availability.

### 6. Purchase, Order & Invoice Workflows

Once a customer explicitly confirms a product selection and purchase, RELAY supports the associated sales workflow.

**Order Management**

- Supports purchase confirmation and order management.
- Connects purchase workflows with customer and sales information.

**Invoice Generation & Management**

- Uses PDFKit for PDF-related invoice generation.
- Connects invoice operations with order workflows.
- Supports invoice records and related management operations.

### 7. Conversation History & Call Reporting

After a voice interaction, RELAY processes the call report and connects the conversation to CRM information when customer identification is possible.

**How it works:**

`Vapi Call → End-of-Call Webhook → Customer Matching → Conversation Storage → CRM Dashboard`

- Processes Vapi end-of-call reports through a webhook.
- Associates conversations with CRM customers when identification is possible.
- Stores conversation information in MongoDB.
- Makes conversation records available to the backend and dashboard.

### 8. Backend Event & Error Logging

RELAY records call-processing events to help identify failures in customer identification and other backend workflows.

- Records call-processing success and failure events.
- Stores log entries in a persistent text file.
- Uses India Standard Time (IST) timestamps.
- Helps identify failures in customer identification and other backend workflows.
- Supports more specific error messages for troubleshooting.

**Example:**

```text
[28/10/2026, 20:35:18 IST] SUCCESS | Customer ID: ... | Customer: Anupama | Message: Call report processed and conversation saved
```

### 9. CRM & Admin Dashboard

RELAY includes a centralized dashboard for viewing and managing business information connected to the backend.

**Features:**

- Customer records and counts.
- Sales lead records and counts.
- Conversation history.
- Product and inventory information.
- Connected backend API data.
- Sales-related management views.

> **Benefit:** Information collected during AI conversations becomes accessible through a centralized management interface.

---

## End-to-End Sales Workflow

The following sequence brings the individual features together into one sales process:

1. A customer interacts with the RELAY voice agent.
2. The agent collects and validates customer information.
3. RELAY searches the CRM or creates a customer record.
4. The agent understands the customer's product requirements and purchase intent.
5. RELAY creates or updates a structured lead.
6. AI recommends relevant laptop models.
7. Inventory is checked when necessary.
8. A customer-confirmed product selection can be recorded against the lead.
9. An explicitly confirmed purchase can proceed through the order workflow.
10. Call information is processed and stored for CRM visibility.

---

## System Architecture

The architecture connects the voice agent to the RELAY backend, which coordinates customer management, sales intelligence, inventory, and recommendations. MongoDB stores the associated information, while the dashboard and order and invoice workflows provide access to the resulting business records.

```text
                    CUSTOMER
                       |
                       v
                 VAPI VOICE AGENT
                       |
                 Tool / API Calls
                       |
                       v
                 RELAY BACKEND
                (Node + Express)
                       |
          +------------+------------+
          |            |            |
          v            v            v
      Customer       Sales       Inventory &
     Management   Intelligence  Recommendations
          |            |            |
          +------------+------------+
                       |
                       v
                MONGODB DATABASE
                       |
              +--------+--------+
              |                 |
              v                 v
         CRM DASHBOARD     ORDERS / INVOICES

 Vapi End-of-Call Report → Webhook → Conversation Storage
```

---

## Backend API Modules

The backend organizes functionality into dedicated REST API modules.

| API Module | Purpose |
|---|---|
| `/api/customers` | Customer records |
| `/api/leads` | Sales leads |
| `/api/products` | Product catalogue |
| `/api/inventory` | Stock information |
| `/api/conversations` | Conversation records |
| `/api/followups` | Follow-up management |
| `/api/ai` | AI-related operations |
| `/api/vapi` | Voice-agent tools and webhooks |
| `/api/orders` | Order management |
| `/api/invoices` | Invoice operations |
| `/health` | Backend health check |

**Vapi tool operations include:** customer lookup, customer creation, lead creation and updates, laptop recommendations, inventory checks, laptop selection, purchase confirmation, and webhook processing.

---

## Tech Stack

| Category | Technology |
|---|---|
| Frontend | React / Next.js |
| UI | Tailwind CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB, Mongoose |
| AI Layer | Google Gemini (`@google/genai`) |
| Voice AI | Vapi |
| API Communication | REST APIs, JSON, Webhooks |
| PDF Generation | PDFKit |
| Data Import | CSV Parser |
| Development | VS Code, Git, GitHub |

---

## Why RELAY?

- Solves a practical business sales-automation problem.
- Combines conversational AI with backend business operations.
- Connects voice interactions directly to CRM workflows.
- Uses modular services and dedicated API endpoints.
- Supports structured customer, lead, inventory, and order data.
- Provides a foundation for multi-agent orchestration and advanced automation.
- Offers opportunities for academic demonstration, iterative development, and further research.

---

## Vision

RELAY aims to make sales workflows more intelligent by connecting natural conversations with structured business operations.

Instead of treating customer calls as isolated interactions, RELAY turns them into actionable information that can support customer management, lead generation, product recommendations, and sales execution.

---

**RELAY**  
*Turning conversations into intelligent sales actions.*
