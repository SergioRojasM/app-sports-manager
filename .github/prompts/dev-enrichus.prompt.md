---
description: Enrich a User Story with technical details to make it developer-ready.
---

**Input**: Optionally specify a user story file path after `/dev-enrichus` (e.g., `/dev-enrichus: userstory/0001_create_auth.md`). if omitted you MUST prompt for the file path.

**Steps**

1. You will act as a product expert with technical knowledge
2. Understand the problem described in the user story
3. complement the user story with the technical and specific detail necessary to allow the developer to be fully autonomous when completing it. Include a full description of the functionality, a comprehensive list of fields to be updated, the structure and URLs of the necessary endpoints, the files to be modified according to the architecture and best practices, the steps required for the task to be considered complete, how to update any relevant documentation or create unit tests, and non-functional requirements related to security, performance, etc. Use the technical context you will find in
projectspec/03-project-structure.md. Return it in markdown format.
5. Update the user story, adding the new content after the old one and marking each section with the h2 tags [original] and [enhanced]. Apply proper formatting to make it readable and visually clear, using appropriate text types (lists, code snippets...).