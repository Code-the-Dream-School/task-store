# Code the Dream Task Store

This repository contains code for a task store.  There are users and tasks, each task belongs to a user, and there are CRUD operations for
register/logon/logoff and task list,create/show/update/delete.

Todo: Swagger docs.

## Setup

After cloning this repository, do an `npm install` from the created directory, and then an 

The following environment variables are needed in the .env file:

```
JWT_SECRET (long difficult to guess string)
TEST_DATABASE_URL (postgres database for test)
DATABASE_URL (dev postgres database or, for deployment, the production postgres)
ALLOWED_ORIGINS=http://localhost:3000
GOOGLE_CLIENT_ID (for support of Google logon)
GOOGLE_CLIENT_SECRET
RECAPTCHA_SECRET
MAX_TASKS_PER_USER (default is 100)
```

The following environment variables are needed in the test environment.

```
TEST_DATABASE_URL (postgres database for test)
RECAPTCHA_BYPASS (long difficult to guess string)
```

After setting these up, do `npx prisma migrate dev` (for the development environment) or `npx prisma migrate deploy` (for the production environment).

For the test environment, set the DATABASE_URL environment variable to the test database URL and do the prisma schema migration.

## License

This project is licensed under the MIT License – see the [LICENSE](./LICENSE) file for details.
Copyright (c) 2025 Code the Dream