# User Story: Supabase Authentication Implementation

## [original]

## ID
US-0001

## Name
Implementation of login system with Supabase

### As a...
As a user

### I want...
I want to login and logout from the application securely

### So that...
I can access protected pages and view my available information

### Description
This user story implements a complete authentication system using Supabase as the authentication provider. Users will be able to create new accounts, log in with existing credentials, and log out securely. The system must protect sensitive routes and maintain the user's authentication state during their session. A proxy middleware must be implemented.

### Expected Result
- A simple login page with user/pasword
- A simple dashboard (protected)
- User can Login and Logout
- Protected routes cant be accesed without authentication
