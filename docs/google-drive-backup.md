# Google Drive Backup Setup

Oshimochi can store manual backup snapshots in a folder chosen by the user.
Google Drive is not the live database and does not sync edits between devices.

This guide uses a Google Cloud project controlled by the person or group setting
up backup. No Oshimochi server or client secret is required.

## What Is Stored Where

| Part | Purpose |
| --- | --- |
| Browser IndexedDB | The live catalog on this browser profile and origin |
| Google Cloud project | OAuth identity, API settings, and API quota |
| Signed-in Google account | Owns or can access the Drive backup folder |
| Selected Drive folder | Stores the compressed backup snapshots |

Sharing a Cloud project does not share catalog data. It only shares OAuth
configuration and API quota.

Members can use one snapshot pool when they use credentials from the same Cloud
project and choose one regular My Drive folder shared with edit access. Their
browser databases remain separate. One member must back up, and another must
manually restore that snapshot, before their local catalogs match.

Restore replaces the full local catalog. It does not merge changes. Oshimochi
keeps only the newest three Oshimochi snapshots in the selected folder. A group
using one folder therefore shares the same three-snapshot retention pool.

The current adapter does not support Google Workspace Shared Drives. The
multi-account, shared-folder flow also needs a real manual round-trip test before
it is treated as a release guarantee.

## Before You Start

You need:

- a Google account
- an existing Drive folder for the backups
- the Oshimochi URL you will use
- permission to create a Google Cloud project

For the first test, create a Drive folder named `Oshimochi Test Backups`.

## 1. Create A Cloud Project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Open the project selector at the top.
3. Choose **New Project**.
4. Enter a name such as `Oshimochi Backup`.
5. Create the project, then select it.

Keep every following Google setting in this same project.

## 2. Enable The APIs

1. Open **APIs & Services > Library**.
2. Search for **Google Drive API** and enable it.
3. Return to the library.
4. Search for **Google Picker API** and enable it.

Both APIs are required. Drive transfers snapshots. Picker lets the user choose
the destination folder.

## 3. Configure Google Auth

1. Open **Google Auth Platform**.
2. Complete the required **Branding** fields.
3. Under **Audience**, choose **External**.
4. Keep the publishing status at **Testing** while developing.
5. Add your Google account under **Test users**.
6. Under **Data Access**, add this scope:

```text
https://www.googleapis.com/auth/drive.file
```

Testing projects show a warning during consent. A test user's authorization
normally expires after seven days, so connecting again is expected.

## 4. Create The Web OAuth Client

1. Open **Google Auth Platform > Clients**.
2. Choose **Create Client**.
3. Select **Web application**.
4. Give it a name such as `Oshimochi Web`.
5. Add each URL you use under **Authorized JavaScript origins**.
6. Create the client and copy its **Client ID**.

Use these origins for the official hosted app:

```text
https://uduru0522.github.io
```

Use these origins for the local app:

```text
http://localhost
http://localhost:4173
```

An origin has no path. Do not add `/oshimochi/` and do not add a
trailing wildcard here. No redirect URI is needed for this browser flow.

The client ID ends in `.apps.googleusercontent.com`. Do not copy or enter a
client secret.

## 5. Create And Restrict The API Key

1. Open **APIs & Services > Credentials**.
2. Choose **Create credentials > API key**.
3. In the form that opens, enter a clear key name.
4. Under **Application restrictions**, choose **Websites**.
5. Add the website rules you need.

For the hosted app:

```text
https://uduru0522.github.io/*
```

For local testing:

```text
http://localhost/*
http://localhost:4173/*
```

Google Picker also requires:

```text
https://docs.google.com/*
```

Under **API restrictions**, choose **Restrict key**. Select both **Google
Picker API** and **Google Drive API**. Create the key, then copy the generated
value.

## 6. Copy The Project Number

1. Open **IAM & Admin > Settings**.
2. Copy **Project number**.

Use the numeric project number, not the project name or project ID. It must
belong to the same project as the OAuth client and API key.

## 7. Connect Oshimochi

1. Open Oshimochi.
2. Open **More > Administration**.
3. Find **Google Drive** under **Backup and restore**.
4. Enter the **Google OAuth client ID**.
5. Enter the **Google Picker API key**.
6. Enter the **Google Cloud project number**.
7. Choose **Save Drive setup**.
8. Choose **Connect** and approve the requested Drive access.
9. Choose the **Backup folder** row.
10. Select the existing backup folder.

The setup values and folder choice stay in this browser's `localStorage`.
They must be entered again on another origin or browser profile.

## Back Up And Restore

Backup is manual. Oshimochi does not upload after each edit or run a background
schedule. Follow [Back Up To Google Drive](workflows.md#back-up-to-google-drive)
and [Restore From Google Drive](workflows.md#restore-from-google-drive) for the
app steps. Reconnect after a page reload.

Restore changes only the current browser database. Other devices do not update
until they restore a snapshot themselves.

## Debug Mode

Debug mode uses temporary sample data. Refreshing the page rebuilds the sample
catalog and discards edits or restores made in that debug session.

Google setup and the selected folder use `localStorage`. Normal and debug mode
on the same origin therefore see the same setup. The access token stays only in
memory, so either mode shows Google Drive as disconnected after a refresh.

A backup made in debug mode is a real Drive file containing the sample catalog.
It also counts toward the three-snapshot retention limit in that folder. Use a
dedicated test folder and do not select a folder that contains important user
backups.

## Test The Full Flow

Use this sequence for a safe local test:

1. Start the app with `npm start`.
2. Open `http://localhost:4173/?debug=1`.
3. Complete the Google setup and connect.
4. Select `Oshimochi Test Backups`.
5. Choose **Back up now**.
6. Confirm that one `.json.gz` file appears in that Drive folder.
7. Edit or delete one debug item.
8. Choose **Restore from cloud** and restore the snapshot.
9. Confirm that the earlier sample catalog returns.
10. Refresh the page.

After step 10, debug fixtures return, the setup and folder remain, and the
Google session is disconnected. Choose **Connect** again to list the real Drive
snapshot.

Repeat the round trip at the hosted URL after changing authentication, transfer,
or restore behavior. Use a separate test folder there because localhost and
GitHub Pages are different browser origins. Outstanding verification is tracked
in the [Roadmap](roadmap.md#outstanding-drive-verification).

## Cost And Quota

Oshimochi does not enable billing or buy storage. Backup files count against
the signed-in account's normal Drive storage. If that storage is full, a new
backup fails instead of purchasing more space.

Google controls Drive API quotas and billing policy, and those rules can change.
Review the current official limits before sharing a Cloud project broadly.
Oshimochi itself never links a billing account or enables paid Google services.

This app uses the Cloud project entered on each device. A public Oshimochi
deployment does not use the maintainer's project unless its credentials are
shared with users.

To check your own exposure:

1. Open **Billing** for the selected Cloud project and check whether an active
   billing account is linked.
2. Open **APIs & Services**, select **Google Drive API**, then review its
   **Quotas** page.
3. If billing is linked, add a budget alert. An alert reports spending; it is
   not a hard spending cap.

See Google's [Drive API usage limits](https://developers.google.com/workspace/drive/api/guides/limits)
and [API usage cap guide](https://docs.cloud.google.com/apis/docs/capping-api-usage)
for the current rules.

## Common Problems

### `origin_mismatch`

Add the exact page origin to the OAuth client's **Authorized JavaScript
origins**. Do not include a path.

### `API developer key is invalid`

Check that the Picker API is enabled. Also check that the API key allows the app
website and `https://docs.google.com/*`.

### Access Is Blocked

While the project is in **Testing**, add the signed-in Google account as a test
user. Confirm that the OAuth client, API key, and project number come from the
same Cloud project.

### The App Is Disconnected After Refresh

This is expected. Access tokens are memory-only. Choose **Connect** again.

### No Backups Are Listed

Confirm the signed-in account and selected folder. Oshimochi lists only its own
marked snapshots from that folder.

## Security Notes

- Never enter or commit a client secret.
- Restrict the browser API key by website and API. Authorized JavaScript origins
  restrict where the browser flow can start.
- The client ID, restricted API key, and project number are public app values.
- Drive access still requires the user's short-lived OAuth token. Google Picker
  grants access to the selected folder.
- Access tokens go only to Google APIs and are never stored in backups.
- Disconnect revokes the active grant when a valid token is available.
- Users must trust the JavaScript served by the hosted origin while connected.
- Backup archives are compressed, not encrypted. Anyone with folder access can
  decompress and read them.
- **Remove Drive setup** removes the local Google configuration from this
  origin.

For deployment isolation, a user can fork and host the same static app, then
authorize only that origin. No backend is needed.

Official references:

- [Google browser token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Google Picker setup](https://developers.google.com/workspace/drive/picker/guides/web-picker)
- [Create a Web OAuth client](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid)
- [Choose Drive API scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Manage OAuth test users](https://support.google.com/cloud/answer/15549945)
