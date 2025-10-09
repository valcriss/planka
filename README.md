# Planka

**Modern, self-hosted project boards for teams who need real-time collaboration.**

![Demo](assets/demo.gif)

Planka combines a collaborative Kanban interface with a Sails.js backend and a fast React client. It is designed to be easy to run on your own infrastructure while still offering the collaborative features expected from a hosted productivity platform.

## Key Features

- **Real-time collaboration** powered by websockets keeps every participant in sync without manual refreshes.
- **Flexible project structure** with projects, boards, swimlanes, lists, cards, comments, checklists, and attachments.
- **Rich editing tools** including markdown formatting, code highlighting, due dates, member assignments, and powerful filtering.
- **Granular permissions** with roles for administrators, project owners, board users, and personal project owners.
- **Extensive integrations** through OpenID Connect for authentication and SMTP for email notifications.
- **Customizable storage** options for self-hosted or S3-compatible object storage providers.

## Technology Stack

- **Frontend:** React 18, Vite, Redux, Semantic UI, and Gravity UI components.
- **Backend:** Node.js with Sails.js, Knex-powered PostgreSQL persistence, and Socket.IO for live updates.
- **Database:** PostgreSQL 16 (configurable).
- **Build & Tooling:** ESLint, Jest, Playwright, and Docker for containerized deployments.

## Getting Started

### Development environment

1. Install Node.js 18 (or newer) and npm.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the default server environment template and adjust it to your needs:
   ```bash
   cp server/.env.sample server/.env
   ```
   Update the values to point to your PostgreSQL instance. `DATABASE_URL` defaults to `postgresql://postgres@localhost/planka`.
4. Start both the API and client in development mode:
   ```bash
   npm start
   ```
   The client is served by Vite and proxies API calls to the Sails.js server.

Useful helper scripts are available in `package.json`, such as `npm run server:db:migrate` to apply database migrations and `npm run client:lint` to lint the frontend codebase.

### Docker Compose

For a self-contained deployment you can rely on the provided compose file:

```bash
docker compose up -d
```

The compose stack starts two services:

- `planka`: the application, exposed on `http://localhost:3000`.
- `postgres`: a PostgreSQL database with persistent volumes for data and uploaded assets.

Environment variables can be overridden in the compose file or supplied via an `.env` file. Secrets such as the database password or SMTP credentials can be stored using Docker secrets (see commented examples inside `docker-compose.yml`).

### Configuration

Environment variables control most behavior. The `server/.env.sample` file documents the available options, including:

- `BASE_URL`: public URL of the instance.
- `DATABASE_URL`: PostgreSQL connection string.
- `SECRET_KEY`: used for token signing.
- `DEFAULT_*` values for provisioning the first administrator.
- `S3_*` settings for external file storage.
- `OIDC_*` values for OpenID Connect login.
- `SMTP_*` options for email notifications.

Set the variables you need before starting the application.

## Contributing

Contributions, bug reports, and feature proposals are welcome. Please open an issue or pull request with a clear description of your changes and, if possible, accompanying tests.

Before submitting changes, run the lint and test suites:

```bash
npm run lint
npm test
```

## License

This repository is distributed under the terms described in [`LICENSE.md`](LICENSE.md). Commercial licensing options are also described in the accompanying files inside the `LICENSES/` directory.
