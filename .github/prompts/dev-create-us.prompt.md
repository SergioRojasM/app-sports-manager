---
description: Create a User Story with technical details to make it developer-ready.
---

**Input**: Specify de description of the user story, if user doesn't provide you mus ask them for the description. cont conitnue without the description.


**Steps**

1. Always create the user story in english, even if the input is in another language.
2. You will act as a product expert with technical knowledge
3. Understand the problem described in input, if you need more details ask for them
4. Create a markup file in folder projectspec/userstory with name us{next-number}-{descritpion-name}. where next-number corresponds to the next available number in folder (e.g., us000n) and descritpion-name corresponds a short description of the user sotry.
5. Create the user story with the technical and specific detail necessary to allow the developer to be fully autonomous when completing it. Includ secions like Title, ID, Name, As a, I Want, so That, description and expected results. Include a full description of the functionality, a comprehensive list of fields to be updated, the structure and URLs of the necessary endpoints, the files to be modified according to the architecture and best practices, the steps required for the task to be considered complete, how to update any relevant documentation or create unit tests, and non-functional requirements related to security, performance, etc. Use the technical context you will find in
projectspec/03-project-structure.md. Return it in markdown format.