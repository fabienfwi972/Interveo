# SAVManager – Dashboard des Disponibilités Clients

Ce dépôt fait partie du projet **SAVManager**, outil métier pour la gestion des interventions SAV en Martinique.

🎯 **Objectif de ce module**  
Permettre de visualiser en temps réel les **créneaux de disponibilités clients** enregistrés via un formulaire connecté à une Google Sheet.

---

## 🔗 Dashboard en ligne

👉 [Voir le dashboard en ligne](https://fabienfw972.github.io/SAVManager-dispos/dashboard_disponibilites.html)

---

## ⚙️ Fonctionnalités

- Lecture sécurisée des données via **Google Sheets + OpenSheet**
- Données **groupées par client** avec fusion des créneaux
- Affichage responsive avec **Tailwind CSS**
- Bouton de rafraîchissement pour recharger les données en temps réel

---

## 🧱 Architecture

- `dashboard_disponibilites.html` : Interface HTML du dashboard
- Google Sheet : Source centrale des disponibilités client
- OpenSheet : passerelle de lecture JSON sécurisée

---

## 🔐 Sécurité & vie privée

Les données client sont uniquement accessibles par clé publique depuis la Google Sheet, sans authentification, mais aucune information sensible n’est exposée (email, téléphone…).

---

## 📌 Prochaines évolutions

- Ajout de filtres (zones géographiques, types de créneaux)
- Export CSV/PDF
- Connexion avec planning technicien
- Intégration du **formulaire de disponibilité** (module relié)

---

© Fabien Chenavas • Projet SAVManager – v1.0 Bêta
