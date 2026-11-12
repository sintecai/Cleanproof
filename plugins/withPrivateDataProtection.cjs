const { withAppDelegate } = require("@expo/config-plugins");
const marker = "// CleanProof private data protection v1";
const statement = `${marker}
    // Fail closed before React/SQLite opens. Existing files are preserved on any failure.
    do {
      let manager = FileManager.default
      let roots = [FileManager.SearchPathDirectory.documentDirectory, .applicationSupportDirectory, .cachesDirectory]
      for root in roots {
        var directory = try manager.url(for: root, in: .userDomainMask, appropriateFor: nil, create: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try directory.setResourceValues(values)
        try manager.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: directory.path)
        var enumerationError: Error?
        guard let children = manager.enumerator(at: directory, includingPropertiesForKeys: [.isSymbolicLinkKey], options: [], errorHandler: { _, error in enumerationError = error; return false }) else {
          throw NSError(domain: "CleanProofProtection", code: 1)
        }
        do {
          for case var child as URL in children {
            if try child.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink == true { children.skipDescendants(); continue }
            try child.setResourceValues(values)
            try manager.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: child.path)
          }
          if let failure = enumerationError { throw failure }
        }
      }
    } catch {
      fatalError("CleanProof could not protect local files. Existing data has been preserved.")
    }
    // End CleanProof private data protection v1`;
function protect(contents, language) {
  if (language !== "swift")
    throw Error(
      "CleanProof requires the supported Swift AppDelegate; backup protection was not generated.",
    );
  if (contents.includes(marker)) return contents;
  const anchor =
    "    return super.application(application, didFinishLaunchingWithOptions: launchOptions)";
  if (!contents.includes(anchor))
    throw Error(
      "CleanProof could not locate the supported launch hook; do not build without protection.",
    );
  if (!contents.includes("import Foundation"))
    contents = "import Foundation\n" + contents;
  return contents.replace(anchor, "    " + statement + "\n" + anchor);
}
module.exports = function (config) {
  return withAppDelegate(config, (c) => {
    c.modResults.contents = protect(
      c.modResults.contents,
      c.modResults.language,
    );
    return c;
  });
};
module.exports.protect = protect;
