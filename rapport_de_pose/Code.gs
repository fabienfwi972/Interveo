
function doGet() {
  return HtmlService.createHtmlOutputFromFile('formulaire');
}

function doPost(e) {
  const clientEmail = e.parameter.client_email;
  const poseurEmail = e.parameter.poseur_email;
  const mendelEmail = "mendle.marchand@cuisines-aviva.com";

  let rapportText = `
    Rapport de fin de chantier
    ===========================
    Date des travaux: ${e.parameter.date_travaux}

    Constat de fin de chantier :
  `;

  for (let key in e.parameter) {
    if (key.endsWith("_comment_text")) continue;

    if (key.startsWith("meubles") || key.startsWith("électroménager") || key.startsWith("prestation")) {
      let label = key.replace(/_/g, ' ');
      rapportText += `\n${label} : ${e.parameter[key]}`;
      let commentKey = key + "_comment_text";
      if (e.parameter[key] === "À la charge du client" && e.parameter[commentKey]) {
        rapportText += `\n  ➤ Détail : ${e.parameter[commentKey]}`;
      }
    }
  }

  rapportText += `

    Observations du client:
    ${e.parameter.observations_client}

    Observations du poseur:
    ${e.parameter.observations_poseur}

    Articles installés par le client:\n    ${e.parameter.articles_installes}\n\n    Signature client: ${e.parameter.signature_client}
  `;

  const pdf = Utilities.newBlob(rapportText, "application/pdf", "rapport_pose.pdf");

  GmailApp.sendEmail(clientEmail, "Votre rapport de pose AVIVA", "Veuillez trouver ci-joint votre rapport.", {
    attachments: [pdf],
    cc: poseurEmail + "," + mendelEmail
  });

  return ContentService.createTextOutput("Rapport envoyé avec succès !");
}
