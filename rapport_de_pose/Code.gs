function doPost(e) {
  const clientEmail = e.parameter.client_email;
  const poseurEmail = e.parameter.poseur_email;
  const mendelEmail = "fabien.chenavas@gmail.com";
  const nomClient = e.parameter.nom_client;
  const dateTravaux = e.parameter.date_travaux;

  const htmlTemplate = HtmlService.createTemplateFromFile("Template");
  htmlTemplate.data = e.parameter;  // on passe toutes les données du formulaire

  const htmlContent = htmlTemplate.evaluate().getContent();
  const pdf = Utilities.newBlob(htmlContent, "text/html").getAs("application/pdf").setName("rapport_pose.pdf");

  GmailApp.sendEmail(clientEmail, "Votre rapport de pose AVIVA", "Veuillez trouver ci-joint votre rapport de fin de chantier.", {
    attachments: [pdf],
    cc: `${poseurEmail},${mendelEmail}`
  });

  return ContentService.createTextOutput("Rapport envoyé avec succès !");
}
