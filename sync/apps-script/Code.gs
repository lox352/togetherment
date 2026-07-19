/**
 * Togetherment sync webhook — Google Apps Script web app.
 *
 * The app POSTs here after rota/availability/gathering changes; this script
 * triggers the "Sync Google Calendar" GitHub workflow using a PAT stored in
 * Script Properties (server-side — never in the repo or the app bundle).
 *
 * Deployment steps: see README.md in this directory.
 */
const REPO = "lox352/togetherment";
const WORKFLOW = "sync-calendar.yml";

function doPost() {
  const pat = PropertiesService.getScriptProperties().getProperty("GITHUB_PAT");
  if (!pat) {
    return ContentService.createTextOutput("error: GITHUB_PAT script property not set");
  }
  const res = UrlFetchApp.fetch(
    "https://api.github.com/repos/" + REPO + "/actions/workflows/" + WORKFLOW + "/dispatches",
    {
      method: "post",
      headers: {
        Authorization: "Bearer " + pat,
        Accept: "application/vnd.github+json",
      },
      contentType: "application/json",
      payload: JSON.stringify({ ref: "main" }),
      muteHttpExceptions: true,
    },
  );
  // GitHub returns 204 No Content on success.
  const code = res.getResponseCode();
  return ContentService.createTextOutput(
    code === 204 ? "ok" : "error " + code + ": " + res.getContentText(),
  );
}

// Visiting the URL in a browser shows a status line without triggering a sync.
function doGet() {
  return ContentService.createTextOutput(
    "Togetherment sync webhook is running. POST to trigger a calendar sync.",
  );
}
