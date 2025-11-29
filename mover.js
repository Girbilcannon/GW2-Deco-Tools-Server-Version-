function updateMoverMode() {
  const bringZero = document.getElementById("mover-worldzero").checked;
  const startInput = document.getElementById("mover-start");
  const endInput = document.getElementById("mover-end");

  if (!startInput || !endInput) return;

  const startZone = startInput.closest(".drop-zone");
  const endZone = endInput.closest(".drop-zone");

  startInput.disabled = bringZero;
  endInput.disabled = bringZero;

  if (startZone) startZone.classList.toggle("disabled", bringZero);
  if (endZone) endZone.classList.toggle("disabled", bringZero);
}

function runMover() {
  const mainFile  = document.getElementById("mover-main").files[0];
  const startFile = document.getElementById("mover-start").files[0];
  const endFile   = document.getElementById("mover-end").files[0];
  const bringZero = document.getElementById("mover-worldzero").checked;

  if (!mainFile) {
    alert("Please select the Main Decorations XML.");
    return;
  }

  // World Zero mode: only main file used
  if (bringZero) {
    loadXML(mainFile, mainXML => {
      const props = mainXML.getElementsByTagName("prop");
      if (!props.length) {
        alert("No <prop> entries found in the Main Decorations XML.");
        return;
      }

      let sumX = 0, sumY = 0, sumZ = 0;
      let count = 0;

      // First pass: compute average position
      for (let p of props) {
        const posAttr = p.getAttribute("pos");
        if (!posAttr) continue;
        const parts = posAttr.split(" ").map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) continue;

        sumX += parts[0];
        sumY += parts[1];
        sumZ += parts[2];
        count++;
      }

      if (!count) {
        alert("Could not compute average position; no valid pos attributes found.");
        return;
      }

      const avgX = sumX / count;
      const avgY = sumY / count;
      const avgZ = sumZ / count;

      // Second pass: shift all props so average ends up at (0, 0, 0)
      for (let p of props) {
        const posAttr = p.getAttribute("pos");
        if (!posAttr) continue;
        const parts = posAttr.split(" ").map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) continue;

        const newPos = [
          parts[0] - avgX,
          parts[1] - avgY,
          parts[2] - avgZ
        ];

        p.setAttribute("pos", newPos.join(" "));
      }

      const serializer = new XMLSerializer();
      let xmlResult = serializer.serializeToString(mainXML);
      xmlResult = prettyPrintXML(xmlResult);

      const outName = mainFile.name.replace(/\.xml$/i, "_ZEROED.xml");
      downloadBlob(xmlResult, outName, "application/xml");
    });

    return;
  }

  // Legacy mode: requires start/end and uses delta vector
  if (!startFile || !endFile) {
    alert("Please select the Start and End Location XML files, or enable 'Bring Deco to World Zero'.");
    return;
  }

  loadXML(startFile, startXML => {
    loadXML(endFile, endXML => {
      loadXML(mainFile, mainXML => {

        const start = startXML.getElementsByTagName("prop")[0];
        const end   = endXML.getElementsByTagName("prop")[0];

        if (!start || !end) {
          alert("Start or End XML has no <prop> entries.");
          return;
        }

        const s = start.getAttribute("pos").split(" ").map(Number);
        const d = end.getAttribute("pos").split(" ").map(Number);

        if (s.length !== 3 || d.length !== 3 || s.some(isNaN) || d.some(isNaN)) {
          alert("Invalid pos attribute in Start or End XML.");
          return;
        }

        const delta = [d[0] - s[0], d[1] - s[1], d[2] - s[2]];

        const props = mainXML.getElementsByTagName("prop");

        for (let p of props) {
          const posAttr = p.getAttribute("pos");
          if (!posAttr) continue;
          const pos = posAttr.split(" ").map(Number);
          if (pos.length !== 3 || pos.some(isNaN)) continue;

          const moved = [pos[0] + delta[0], pos[1] + delta[1], pos[2] + delta[2]];
          p.setAttribute("pos", moved.join(" "));
        }

        const serializer = new XMLSerializer();
        let xmlResult = serializer.serializeToString(mainXML);
        xmlResult = prettyPrintXML(xmlResult);

        const outName = mainFile.name.replace(/\.xml$/i, "_moved.xml");
        downloadBlob(xmlResult, outName, "application/xml");
      });
    });
  });
}
