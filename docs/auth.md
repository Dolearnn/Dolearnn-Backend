# Auth Plan

DoLearn will support two login methods:

- Email and password
- Google OAuth

## Account Rules

### Families

Families can sign up with email/password or Google.

If a Google email does not exist yet:

1. Create a `User`.
2. Set `role` to `PARENT`.
3. Set `authProvider` to `GOOGLE`.
4. Store the verified Google subject in `googleId`.
5. Create a `ParentProfile`.

If the Google email already exists:

1. Link the Google identity if needed.
2. Set `authProvider` to `BOTH` when the account already has a password.
3. Log the user in.

### Teachers

Teachers should not freely create accounts.

Admin creates the teacher account first. After that, the teacher can log in with:

- The default password flow, then reset password later.
- Google OAuth, but only if the Google email matches an existing teacher account.

If a teacher email does not already exist, Google login should be rejected.

### Admins

Admin accounts should be created manually or through a protected seed/admin process. Public signup should never create admin accounts.

## Token Flow

The frontend sends a Google ID token to the backend.

The backend verifies it with `google-auth-library` using `GOOGLE_CLIENT_ID`, then issues the platform session token.

Planned package:

```bash
npm install google-auth-library
```

## User Fields

`passwordHash` is optional because Google-only users may not have a password.

`googleId` is unique because it identifies a verified Google account.

`authProvider` can be:

- `EMAIL`
- `GOOGLE`
- `BOTH`

