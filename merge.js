function runMerge() {
  const originalFile = document.getElementById("merge-original").files[0];
  const addFilesList = document.getElementById("merge-add").files;

  if (!originalFile) {
    alert("Please select an Original Deco Layout XML file.");
    return;
  }

  if (!addFilesList || !addFilesList.length) {
    alert("Please select at least one Add Decos XML file.");
    return;
  }

  const addFiles = Array.from(addFilesList);

  loadXML(originalFile, originalXML => {
    const origDecor = originalXML.getElementsByTagName("Decorations")[0];
    if (!origDecor) {
      alert("No <Decorations> tag found in Original XML.");
      return;
    }

    // Process add files sequentially to keep ordering
    function processNext(index) {
      if (index >= addFiles.length) {
        // All add-files handled -> serialize & download
        const serializer = new XMLSerializer();
        let mergedXML = serializer.serializeToString(originalXML);
        mergedXML = prettyPrintXML(mergedXML);

        const baseOrig = originalFile.name.replace(/\.xml$/i, "");
        const outName  = `${baseOrig}_MERGED.xml`;

        downloadBlob(mergedXML, outName, "application/xml");
        return;
      }

      const addFile = addFiles[index];

      loadXML(addFile, addXML => {
        const addDecor = addXML.getElementsByTagName("Decorations")[0];
        if (!addDecor) {
          // No decorations in this file – skip but continue the chain
          console.warn(`No <Decorations> tag found in Add Decos XML: ${addFile.name}`);
          processNext(index + 1);
          return;
        }

        const addProps = addDecor.getElementsByTagName("prop");
        if (!addProps.length) {
          // No props – skip but continue
          console.warn(`No <prop> entries found in Add Decos XML: ${addFile.name}`);
          processNext(index + 1);
          return;
        }

        // Comment based on this add file's name (no .xml)
        const addBaseName = addFile.name.replace(/\.xml$/i, "");
        const commentNode = originalXML.createComment(addBaseName);

        // Insert newline + comment + newline for readability
        origDecor.appendChild(originalXML.createTextNode("\n  "));
        origDecor.appendChild(commentNode);
        origDecor.appendChild(originalXML.createTextNode("\n  "));

        // Append merged props after comment
        for (let i = 0; i < addProps.length; i++) {
          const importedProp = originalXML.importNode(addProps[i], true);
          origDecor.appendChild(importedProp);
          origDecor.appendChild(originalXML.createTextNode("\n  "));
        }

        // Move on to the next add file
        processNext(index + 1);
      });
    }

    processNext(0);
  });
}
