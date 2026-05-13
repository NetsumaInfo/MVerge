/* AMVerge CEP host script bootstrap. */

$.amverge = $.amverge || {};

(function (ns) {
  function buildResult(status, message) {
    return status + "|" + String(message || "");
  }

  function normalizeHostPath(value) {
    var text = String(value || "");
    if (!text) return "";
    return text.replace(/\//g, "\\");
  }

  ns.ping = function () {
    return "pong";
  };

  ns.importMediaIntoAfterEffects = function (mediaPaths) {
    if (!mediaPaths || !(mediaPaths instanceof Array) || mediaPaths.length === 0) {
      return buildResult("ERR", "No media paths provided.");
    }

    var imported = 0;
    var missing = [];
    var failed = [];

    app.beginSuppressDialogs();
    app.beginUndoGroup("AMVerge Auto Import");

    try {
      if (!app.project) {
        app.newProject();
      }

      for (var i = 0; i < mediaPaths.length; i++) {
        var normalizedPath = normalizeHostPath(mediaPaths[i]);
        if (!normalizedPath) continue;

        var mediaFile = new File(normalizedPath);
        if (!mediaFile.exists) {
          missing.push(normalizedPath);
          continue;
        }

        try {
          var importOptions = new ImportOptions(mediaFile);
          var importedItem = app.project.importFile(importOptions);
          if (importedItem) {
            imported++;
          } else {
            failed.push(normalizedPath + " -> null item");
          }
        } catch (importError) {
          failed.push(normalizedPath + " -> " + importError.toString());
        }
      }
    } catch (error) {
      return buildResult("ERR", error.toString());
    } finally {
      app.endUndoGroup();
      app.endSuppressDialogs(false);
    }

    if (failed.length > 0) {
      return buildResult("ERR", "Import failed: " + failed.join(" || "));
    }

    if (missing.length > 0) {
      if (imported > 0) {
        return buildResult(
          "WARN",
          "Imported " + imported + " file(s). Missing: " + missing.join(" | ")
        );
      }
      return buildResult("ERR", "Missing files: " + missing.join(" | "));
    }

    return buildResult("OK", "Imported " + imported + " file(s).");
  };
})($.amverge);
