# Extension Messaging & API Contracts: JobMate

## 1. Chrome Extension IPC Contracts

Communication between the UI interfaces (`popup`, `sidepanel`, `options`), background service worker, and the webpage `content` script uses typed JSON messages.

### Message Types (`src/types/messaging.ts`)

#### `SCAN_FORM`
Requests the content script on the active tab to inspect the current DOM and detect form inputs.
- **Request**: `{ type: "SCAN_FORM" }`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "type": "FORM_SCAN_RESULT",
      "website": {
        "url": "https://boards.greenhouse.io/...",
        "hostname": "greenhouse.io",
        "adapterName": "Greenhouse Job Board",
        "title": "Software Engineer Application"
      },
      "fields": [
        {
          "id": "jm-field-1",
          "tagName": "INPUT",
          "fieldType": "text",
          "name": "first_name",
          "label": "First Name",
          "required": true,
          "canonicalField": "FIRST_NAME",
          "confidence": 1.0,
          "status": "MATCHED"
        }
      ]
    }
  }
  ```

#### `FILL_FIELDS`
Sends approved key-value pairings to populate target fields on the webpage.
- **Request**:
  ```json
  {
    "type": "FILL_FIELDS",
    "values": {
      "jm-field-1": "Alex",
      "jm-field-2": "Smith"
    }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "type": "FILL_RESULT",
      "summary": { "total": 2, "success": 2, "failed": 0 },
      "results": [
        { "fieldId": "jm-field-1", "success": true, "message": "Field successfully populated" },
        { "fieldId": "jm-field-2", "success": true, "message": "Field successfully populated" }
      ]
    }
  }
  ```

#### `PING` / `PONG`
Heartbeat check verifying that the content script is active in the current tab.
- **Request**: `{ type: "PING" }`
- **Response**: `{ type: "PONG", "version": "1.0.0" }`
