SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict lOpBPE7y6JUvEnzOXfn3ytHQT2dQ7DZTHPSgXslzJBRlGWUHFiEFIEU0S2lNE6t

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', 'a4a84659-47cb-4892-82d6-3ceb33a90c76', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"admin@local.com","user_id":"111fe5e2-1228-4385-91bd-8380f19fcb80","user_phone":""}}', '2026-03-12 19:16:06.614448+00', ''),
	('00000000-0000-0000-0000-000000000000', '7da33304-4746-44f7-9a7d-a62315b839de', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"user@local.com","user_id":"e77b2be6-86b3-4539-9833-5202da4d36c3","user_phone":""}}', '2026-03-12 19:16:15.971341+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f760c472-dacc-47e4-ac4e-b172bc96a7f6', '{"action":"login","actor_id":"111fe5e2-1228-4385-91bd-8380f19fcb80","actor_username":"admin@local.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-03-12 20:21:01.956615+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b38778fa-eaf9-4d31-a834-83879dad0ec0', '{"action":"login","actor_id":"e77b2be6-86b3-4539-9833-5202da4d36c3","actor_username":"user@local.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-03-12 20:32:28.735639+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ede19f1e-1abb-4ccf-bb8b-b619f810652a', '{"action":"token_refreshed","actor_id":"111fe5e2-1228-4385-91bd-8380f19fcb80","actor_username":"admin@local.com","actor_via_sso":false,"log_type":"token"}', '2026-03-12 22:22:57.051906+00', ''),
	('00000000-0000-0000-0000-000000000000', '820602eb-e6c2-4aa1-872f-9e10d4ecb999', '{"action":"token_revoked","actor_id":"111fe5e2-1228-4385-91bd-8380f19fcb80","actor_username":"admin@local.com","actor_via_sso":false,"log_type":"token"}', '2026-03-12 22:22:57.056972+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ed635367-5801-43d8-92a4-17c39b8f3cb4', '{"action":"token_refreshed","actor_id":"111fe5e2-1228-4385-91bd-8380f19fcb80","actor_username":"admin@local.com","actor_via_sso":false,"log_type":"token"}', '2026-03-12 23:58:23.709958+00', ''),
	('00000000-0000-0000-0000-000000000000', 'daa09d8c-59ed-4478-998f-7ca612869c5a', '{"action":"token_revoked","actor_id":"111fe5e2-1228-4385-91bd-8380f19fcb80","actor_username":"admin@local.com","actor_via_sso":false,"log_type":"token"}', '2026-03-12 23:58:23.712127+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'e77b2be6-86b3-4539-9833-5202da4d36c3', 'authenticated', 'authenticated', 'user@local.com', '$2a$10$ojjEk2DyKHSGFvB1RwZ5aucc.3aAlFJ120PkIz2DpzBUjJo2WRG5.', '2026-03-12 19:16:15.972366+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-12 20:32:28.736684+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-03-12 19:16:15.967389+00', '2026-03-12 20:32:28.73914+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '111fe5e2-1228-4385-91bd-8380f19fcb80', 'authenticated', 'authenticated', 'admin@local.com', '$2a$10$9GZMtCHDM4AqZ5tuPDZY4utit19t4NXEAxufWTr4B5J05P515rsXy', '2026-03-12 19:16:06.616132+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-12 20:21:01.959219+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-03-12 19:16:06.602442+00', '2026-03-12 23:58:23.716255+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('111fe5e2-1228-4385-91bd-8380f19fcb80', '111fe5e2-1228-4385-91bd-8380f19fcb80', '{"sub": "111fe5e2-1228-4385-91bd-8380f19fcb80", "email": "admin@local.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-12 19:16:06.61065+00', '2026-03-12 19:16:06.610694+00', '2026-03-12 19:16:06.610694+00', '5fc7db96-f8d1-478f-a34f-07d8354a22dd'),
	('e77b2be6-86b3-4539-9833-5202da4d36c3', 'e77b2be6-86b3-4539-9833-5202da4d36c3', '{"sub": "e77b2be6-86b3-4539-9833-5202da4d36c3", "email": "user@local.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-12 19:16:15.970701+00', '2026-03-12 19:16:15.970729+00', '2026-03-12 19:16:15.970729+00', '46cfc732-391b-4107-a0cd-84dad7fae0ae');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('85e104ed-f3d8-4b2c-8610-6d0a70aeb8b3', 'e77b2be6-86b3-4539-9833-5202da4d36c3', '2026-03-12 20:32:28.736751+00', '2026-03-12 20:32:28.736751+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '172.19.0.1', NULL, NULL, NULL, NULL, NULL),
	('61e3919e-4dab-4025-b430-19b7e15481bb', '111fe5e2-1228-4385-91bd-8380f19fcb80', '2026-03-12 20:21:01.959978+00', '2026-03-12 23:58:23.721302+00', NULL, 'aal1', NULL, '2026-03-12 23:58:23.721243', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '172.19.0.1', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('61e3919e-4dab-4025-b430-19b7e15481bb', '2026-03-12 20:21:01.96749+00', '2026-03-12 20:21:01.96749+00', 'password', '3732875b-add2-4594-893d-6bf045958e21'),
	('85e104ed-f3d8-4b2c-8610-6d0a70aeb8b3', '2026-03-12 20:32:28.739591+00', '2026-03-12 20:32:28.739591+00', 'password', 'd15ae02b-4109-4617-998f-1b4dd5d7d811');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 2, 'odhq3jqbvbow', 'e77b2be6-86b3-4539-9833-5202da4d36c3', false, '2026-03-12 20:32:28.738255+00', '2026-03-12 20:32:28.738255+00', NULL, '85e104ed-f3d8-4b2c-8610-6d0a70aeb8b3'),
	('00000000-0000-0000-0000-000000000000', 1, 'yshllu6ifizh', '111fe5e2-1228-4385-91bd-8380f19fcb80', true, '2026-03-12 20:21:01.963934+00', '2026-03-12 22:22:57.059462+00', NULL, '61e3919e-4dab-4025-b430-19b7e15481bb'),
	('00000000-0000-0000-0000-000000000000', 3, '7g5574xzid3g', '111fe5e2-1228-4385-91bd-8380f19fcb80', true, '2026-03-12 22:22:57.065138+00', '2026-03-12 23:58:23.712904+00', 'yshllu6ifizh', '61e3919e-4dab-4025-b430-19b7e15481bb'),
	('00000000-0000-0000-0000-000000000000', 4, 'yj5yldhqkyyk', '111fe5e2-1228-4385-91bd-8380f19fcb80', false, '2026-03-12 23:58:23.714877+00', '2026-03-12 23:58:23.714877+00', '7g5574xzid3g', '61e3919e-4dab-4025-b430-19b7e15481bb');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."tenants" ("id", "nombre", "fecha_creacion", "email", "telefono", "instagram_url", "facebook_url", "x_url", "web_url", "logo_url", "descripcion", "created_at", "updated_at") VALUES
	('2a089688-3cfc-4216-9372-33f50079fbd1', 'public', '2026-03-11', 'public@qbop.test', NULL, NULL, NULL, NULL, NULL, NULL, 'Tenant público del sistema. Agrupa entrenamientos con visibilidad pública visibles para todos los usuarios autenticados.', '2026-03-11 23:11:49.023302+00', '2026-03-11 23:11:49.023302+00'),
	('527b0d88-5b97-4d86-b902-c5fef55c7d24', 'Wolfpack', '2026-03-11', 'alpha@qbop.test', '+57 300 000 0001', NULL, NULL, NULL, NULL, NULL, 'Tenant de pruebas Alpha', '2026-03-11 23:11:49.446701+00', '2026-03-11 23:11:49.446701+00');


--
-- Data for Name: disciplinas; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."disciplinas" ("id", "tenant_id", "nombre", "descripcion", "activo", "created_at", "updated_at") VALUES
	('6b6cceeb-d9b5-4c94-9d34-841f207bce40', '527b0d88-5b97-4d86-b902-c5fef55c7d24', 'Atletismo', NULL, true, '2026-03-12 20:27:43.817681+00', '2026-03-12 20:27:43.817681+00'),
	('810b6962-5570-4920-85f6-3e43bedb0597', '527b0d88-5b97-4d86-b902-c5fef55c7d24', 'Natación', NULL, true, '2026-03-11 23:11:49.446701+00', '2026-03-11 23:11:49.446701+00');


--
-- Data for Name: escenarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."escenarios" ("id", "tenant_id", "nombre", "descripcion", "ubicacion", "direccion", "coordenadas", "capacidad", "tipo", "activo", "image_url", "created_at", "updated_at") VALUES
	('ad8e277e-e06a-4c2c-878f-bc7d530c6184', '527b0d88-5b97-4d86-b902-c5fef55c7d24', 'Innova Schools', 'Piscina Semi Olimpica de 4 carriles', NULL, 'Cl. 130 #59b-61, Bogotá', '4.721244521246687, -74.07210617696201', 24, 'Natacion Indoor', true, NULL, '2026-03-12 20:24:31.909077+00', '2026-03-12 20:24:31.909077+00'),
	('1d3ff2b1-378b-4baf-be25-b9adbd13ff30', '527b0d88-5b97-4d86-b902-c5fef55c7d24', 'Pista Atletismo', 'Pista Atletica', 'Liceo Cervantes', 'Cl. 153 #19-39, Bogotá', '4.736379354848041, -74.04603291744809', 50, 'Atletismo en Pista', true, NULL, '2026-03-12 20:25:54.206624+00', '2026-03-12 20:25:54.206624+00');


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."usuarios" ("id", "email", "nombre", "apellido", "telefono", "fecha_nacimiento", "foto_url", "activo", "created_at", "estado", "tipo_identificacion", "numero_identificacion", "rh") VALUES
	('111fe5e2-1228-4385-91bd-8380f19fcb80', 'admin@local.com', NULL, NULL, NULL, NULL, NULL, true, '2026-03-12 19:16:06.602442+00', 'activo', NULL, NULL, NULL),
	('e77b2be6-86b3-4539-9833-5202da4d36c3', 'user@local.com', NULL, NULL, NULL, NULL, NULL, true, '2026-03-12 19:16:15.967389+00', 'activo', NULL, NULL, NULL);


--
-- Data for Name: entrenamientos_grupo; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: entrenamientos; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: nivel_disciplina; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."nivel_disciplina" ("id", "tenant_id", "disciplina_id", "nombre", "orden", "activo", "created_at") VALUES
	('b9a5ef4b-7771-49dc-b1ca-b7e5d54d3de3', '527b0d88-5b97-4d86-b902-c5fef55c7d24', '810b6962-5570-4920-85f6-3e43bedb0597', 'Nivel 1', 1, true, '2026-03-12 20:21:34.117384+00'),
	('da03cc49-cc04-478f-9aa6-6a0f6452e68b', '527b0d88-5b97-4d86-b902-c5fef55c7d24', '810b6962-5570-4920-85f6-3e43bedb0597', 'Nivel 2', 2, true, '2026-03-12 20:21:43.977597+00'),
	('14f14ac1-e3c1-4ad3-952e-486066314c5f', '527b0d88-5b97-4d86-b902-c5fef55c7d24', '810b6962-5570-4920-85f6-3e43bedb0597', 'Nivel 3', 3, true, '2026-03-12 20:21:55.351935+00'),
	('96f9c698-a4aa-4832-b907-9d11778c7f75', '527b0d88-5b97-4d86-b902-c5fef55c7d24', '810b6962-5570-4920-85f6-3e43bedb0597', 'Nivel 4', 4, true, '2026-03-12 20:22:05.273017+00'),
	('b1dd5190-dfac-4b63-aed7-9277a11f7f20', '527b0d88-5b97-4d86-b902-c5fef55c7d24', '6b6cceeb-d9b5-4c94-9d34-841f207bce40', 'Principiante', 1, true, '2026-03-12 20:27:56.413746+00'),
	('71eadaf8-8676-415a-8c4b-d04186f39089', '527b0d88-5b97-4d86-b902-c5fef55c7d24', '6b6cceeb-d9b5-4c94-9d34-841f207bce40', 'Intermedio', 2, true, '2026-03-12 20:28:10.264143+00'),
	('11928f17-f66e-49d9-a39b-742791b1a24b', '527b0d88-5b97-4d86-b902-c5fef55c7d24', '6b6cceeb-d9b5-4c94-9d34-841f207bce40', 'Avanzado', 3, true, '2026-03-12 20:28:16.409221+00');


--
-- Data for Name: entrenamiento_categorias; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: reservas; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: asistencias; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: entrenamiento_grupo_categorias; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: entrenamientos_grupo_reglas; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: horarios_escenarios; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."roles" ("id", "nombre", "descripcion", "created_at") VALUES
	('4fcc5bd3-b4d5-4b95-ad71-eed4bb43dd08', 'administrador', 'Rol administrativo del tenant', '2026-03-11 23:11:49.023302+00'),
	('dd6a3e75-6dd2-4abf-a014-ff1a9bd4927a', 'entrenador', 'Rol de entrenador del tenant', '2026-03-11 23:11:49.023302+00'),
	('2518c0b1-da64-4f67-9aa1-aaede2e5866b', 'usuario', 'Rol por defecto para nuevos usuarios', '2026-03-11 23:11:49.023302+00');


--
-- Data for Name: miembros_tenant; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."miembros_tenant" ("id", "tenant_id", "usuario_id", "rol_id", "nombre", "descripcion", "created_at") VALUES
	('518c3ec0-debd-4752-8d7e-b26b2ba5def6', '2a089688-3cfc-4216-9372-33f50079fbd1', '111fe5e2-1228-4385-91bd-8380f19fcb80', '2518c0b1-da64-4f67-9aa1-aaede2e5866b', NULL, 'Membresía por defecto para onboarding', '2026-03-12 19:16:06.602186+00'),
	('0ff56574-fb3c-489f-8ac4-5058c1218c3e', '2a089688-3cfc-4216-9372-33f50079fbd1', 'e77b2be6-86b3-4539-9833-5202da4d36c3', '2518c0b1-da64-4f67-9aa1-aaede2e5866b', NULL, 'Membresía por defecto para onboarding', '2026-03-12 19:16:15.96719+00'),
	('c5f4f344-bbfc-473b-90f8-5d2e5e5af3bc', '527b0d88-5b97-4d86-b902-c5fef55c7d24', '111fe5e2-1228-4385-91bd-8380f19fcb80', '4fcc5bd3-b4d5-4b95-ad71-eed4bb43dd08', NULL, NULL, '2026-03-12 20:18:57.263649+00');


--
-- Data for Name: miembros_tenant_solicitudes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."miembros_tenant_solicitudes" ("id", "tenant_id", "usuario_id", "estado", "mensaje", "nota_revision", "rol_solicitado_id", "revisado_por", "revisado_at", "created_at", "updated_at") VALUES
	('bfc09fb0-d831-4ff9-bf9c-23d7df068ed4', '527b0d88-5b97-4d86-b902-c5fef55c7d24', 'e77b2be6-86b3-4539-9833-5202da4d36c3', 'rechazada', NULL, 'NO', NULL, '111fe5e2-1228-4385-91bd-8380f19fcb80', '2026-03-12 20:46:35.459+00', '2026-03-12 20:46:20.293618+00', '2026-03-12 20:46:20.293618+00'),
	('8d40831a-ab29-4479-9305-c1f38d3a82d4', '527b0d88-5b97-4d86-b902-c5fef55c7d24', 'e77b2be6-86b3-4539-9833-5202da4d36c3', 'rechazada', NULL, 'NO', NULL, '111fe5e2-1228-4385-91bd-8380f19fcb80', '2026-03-12 20:46:58.169+00', '2026-03-12 20:46:47.900353+00', '2026-03-12 20:46:47.900353+00'),
	('4b692aec-cab9-450b-b0f0-c623a7723a44', '527b0d88-5b97-4d86-b902-c5fef55c7d24', 'e77b2be6-86b3-4539-9833-5202da4d36c3', 'rechazada', NULL, NULL, NULL, '111fe5e2-1228-4385-91bd-8380f19fcb80', '2026-03-12 20:47:38.551+00', '2026-03-12 20:47:04.129142+00', '2026-03-12 20:47:04.129142+00');


--
-- Data for Name: notificaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: planes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."planes" ("id", "tenant_id", "nombre", "descripcion", "precio", "clases_incluidas", "beneficios", "tipo", "activo", "created_at", "vigencia_meses", "updated_at") VALUES
	('2436a463-99ab-4ea7-bcf2-72f8fb654637', '527b0d88-5b97-4d86-b902-c5fef55c7d24', 'Triatlón Básico Mensual', 'No incluye tiqueteras de piscina', 425000.00, NULL, 'Plan TP básico', 'mixto', true, '2026-03-12 20:30:18.947488+00', 1, '2026-03-12 20:30:36.989751+00');


--
-- Data for Name: suscripciones; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pagos; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: perfil_deportivo; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: planes_disciplina; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."planes_disciplina" ("id", "plan_id", "disciplina_id", "created_at") VALUES
	('4ec32316-122e-4358-a0b2-52a85b3630f3', '2436a463-99ab-4ea7-bcf2-72f8fb654637', '6b6cceeb-d9b5-4c94-9d34-841f207bce40', '2026-03-12 20:30:37.076503+00'),
	('f70be480-bd61-49e3-959f-d83a1aae37fa', '2436a463-99ab-4ea7-bcf2-72f8fb654637', '810b6962-5570-4920-85f6-3e43bedb0597', '2026-03-12 20:30:37.076503+00');


--
-- Data for Name: responsabilidades; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: responsables; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: usuario_nivel_disciplina; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."usuario_nivel_disciplina" ("id", "usuario_id", "tenant_id", "disciplina_id", "nivel_id", "asignado_por", "created_at", "updated_at") VALUES
	('fb033fcb-d6bf-41c3-a98b-8997cdf02afe', 'e77b2be6-86b3-4539-9833-5202da4d36c3', '527b0d88-5b97-4d86-b902-c5fef55c7d24', '810b6962-5570-4920-85f6-3e43bedb0597', 'da03cc49-cc04-478f-9aa6-6a0f6452e68b', '111fe5e2-1228-4385-91bd-8380f19fcb80', '2026-03-12 20:42:51.04378+00', '2026-03-12 20:42:51.484+00'),
	('766b7283-51f5-4022-b3bb-ba8f4ab521ee', 'e77b2be6-86b3-4539-9833-5202da4d36c3', '527b0d88-5b97-4d86-b902-c5fef55c7d24', '6b6cceeb-d9b5-4c94-9d34-841f207bce40', '71eadaf8-8676-415a-8c4b-d04186f39089', '111fe5e2-1228-4385-91bd-8380f19fcb80', '2026-03-12 20:42:51.162896+00', '2026-03-12 20:42:51.603+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 4, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict lOpBPE7y6JUvEnzOXfn3ytHQT2dQ7DZTHPSgXslzJBRlGWUHFiEFIEU0S2lNE6t

RESET ALL;
