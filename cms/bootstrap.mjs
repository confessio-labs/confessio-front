// Sets up a fresh Directus instance for the home page content: the `home`
// singleton and its form, the read-only token the front uses, the copywriter
// role, the live preview URL and the flow that revalidates the front on save.
// The content is seeded from src/app/home/content.default.json.
//
// Usage:
//   DIRECTUS_URL=http://localhost:8055 ADMIN_EMAIL=… ADMIN_PASSWORD=… \
//   FRONT_PUBLIC_URL=https://staging.confessio.fr \
//   FRONT_INTERNAL_URL=http://app:3000 \
//   CMS_PREVIEW_SECRET=… CMS_WEBHOOK_SECRET=… \
//   node cms/bootstrap.mjs
//
// It prints the front's token (CMS_TOKEN). Run it once, on an empty database.

import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const DIRECTUS_URL = env("DIRECTUS_URL");
const FRONT_PUBLIC_URL = env("FRONT_PUBLIC_URL");
const FRONT_INTERNAL_URL = env("FRONT_INTERNAL_URL");
const PREVIEW_SECRET = env("CMS_PREVIEW_SECRET");
const WEBHOOK_SECRET = env("CMS_WEBHOOK_SECRET");

let accessToken;

async function api(method, path, body) {
  const response = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(accessToken && { authorization: `Bearer ${accessToken}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status}: ${text}`);
  }
  return text ? JSON.parse(text).data : null;
}

const fr = (translation) => [{ language: "fr-FR", translation }];

let sort = 0;
const group = (field, label) => ({
  field,
  type: "alias",
  meta: {
    interface: "group-detail",
    special: ["alias", "no-data", "group"],
    options: { start: "closed" },
    translations: fr(label),
    sort: ++sort,
    width: "full",
  },
});

const input = (field, label, groupField, meta = {}) => ({
  field,
  type: "string",
  schema: { max_length: 500 },
  meta: {
    interface: "input",
    translations: fr(label),
    group: groupField,
    sort: ++sort,
    width: "full",
    required: true,
    ...meta,
  },
});

const textarea = (field, label, groupField, meta = {}) => ({
  field,
  type: "text",
  meta: {
    interface: "input-multiline",
    translations: fr(label),
    group: groupField,
    sort: ++sort,
    width: "full",
    required: true,
    ...meta,
  },
});

const repeaterField = (field, name, type, iface, extra = {}) => ({
  field,
  name,
  type,
  meta: {
    field,
    type,
    interface: iface,
    width: "full",
    required: true,
    ...extra,
  },
});

const repeater = (field, label, groupField, template, addLabel, fields) => ({
  field,
  type: "json",
  meta: {
    interface: "list",
    special: ["cast-json"],
    options: { template, addLabel, fields },
    translations: fr(label),
    group: groupField,
    sort: ++sort,
    width: "full",
    required: true,
  },
});

const RICH_TEXT_TOOLBAR = [
  "bold",
  "italic",
  "h3",
  "bullist",
  "numlist",
  "customLink",
  "unlink",
  "removeformat",
  "undo",
  "redo",
];

const FIELDS = [
  group("g_hero", "En-tête"),
  input("hero_title", "Grand titre", "g_hero"),
  input("hero_subtitle", "Sous-titre", "g_hero", {
    note: "C'est le titre principal de la page pour Google.",
  }),
  input("hero_places", "Nombre de lieux", "g_hero"),
  input("hero_places_detail", "Précision (ordinateur seulement)", "g_hero"),

  group("g_news", "Actualité du mois"),
  {
    field: "news_visible",
    type: "boolean",
    schema: { default_value: false },
    meta: {
      interface: "boolean",
      special: ["cast-boolean"],
      options: { label: "Afficher le bandeau sous l'en-tête" },
      translations: fr("Visible"),
      group: "g_news",
      sort: ++sort,
      width: "full",
    },
  },
  input("news_title", "Texte du bandeau", "g_news", { required: false }),
  input("news_link", "Lien", "g_news", {
    required: false,
    note: "Adresse complète, par exemple https://…",
  }),

  group("g_welcome", "Vous êtes attendu"),
  input("welcome_title", "Titre", "g_welcome"),
  textarea("welcome_text", "Texte", "g_welcome"),
  input("steps_title", "Titre des étapes", "g_welcome"),
  repeater("steps", "Étapes", "g_welcome", "{{label}}", "Ajouter une étape", [
    repeaterField("label", "Étape", "string", "input"),
  ]),
  input("steps_link", "Lien vers le déroulé détaillé", "g_welcome", {
    note: "Ouvre la question « Comment me confesser, étape par étape ? ».",
  }),

  group("g_quote", "Citation"),
  textarea("quote_text", "Citation", "g_quote"),
  input("quote_author", "Auteur", "g_quote", { width: "half" }),
  input("quote_source", "Source", "g_quote", { width: "half" }),

  group("g_reasons", "Bonnes raisons"),
  input("reasons_title", "Titre", "g_reasons"),
  repeater(
    "reasons",
    "Raisons",
    "g_reasons",
    "{{text}}",
    "Ajouter une raison",
    [repeaterField("text", "Raison", "text", "input-multiline")],
  ),
  input("reasons_cta", "Bouton", "g_reasons", {
    note: "La dernière raison, avec le lien vers la recherche, s'ajoute automatiquement après celles-ci.",
  }),

  group("g_faq", "Vos questions"),
  input("faq_title", "Titre", "g_faq"),
  repeater(
    "faq",
    "Questions",
    "g_faq",
    "{{question}}",
    "Ajouter une question",
    [
      repeaterField("question", "Question", "string", "input"),
      repeaterField("answer", "Réponse", "text", "input-rich-text-html", {
        options: { toolbar: RICH_TEXT_TOOLBAR },
      }),
      repeaterField("id", "Identifiant", "string", "input", {
        required: false,
        note: "Facultatif. Sert aux liens directs vers la question : ne le changez pas une fois publié.",
        options: { slug: true, trim: true },
      }),
    ],
  ),

  group("g_about", "Qui sommes-nous"),
  input("about_title", "Titre", "g_about"),
  textarea("about_lead", "Introduction", "g_about"),
  textarea("about_text", "Texte", "g_about"),
  input("about_contact_label", "Bouton de contact", "g_about"),

  group("g_closing", "Fin de page"),
  input("closing_title", "Titre", "g_closing"),
];

const COLLECTION = "home";

async function main() {
  ({ access_token: accessToken } = await api("POST", "/auth/login", {
    email: env("ADMIN_EMAIL"),
    password: env("ADMIN_PASSWORD"),
  }));

  await api("PATCH", "/settings", {
    project_name: "Confessio",
    project_color: "#242E4C",
    default_language: "fr-FR",
  });

  await api("POST", "/collections", {
    collection: COLLECTION,
    meta: {
      singleton: true,
      versioning: true,
      icon: "home",
      translations: [
        {
          language: "fr-FR",
          translation: "Page d'accueil",
          singular: "Page d'accueil",
          plural: "Page d'accueil",
        },
      ],
      preview_url: `${FRONT_PUBLIC_URL}/api/preview?secret=${PREVIEW_SECRET}&version={{$version}}`,
    },
    schema: {},
    fields: [
      {
        field: "id",
        type: "integer",
        meta: { hidden: true, readonly: true, interface: "input" },
        schema: { is_primary_key: true, has_auto_increment: true },
      },
    ],
  });
  for (const field of FIELDS) {
    await api("POST", `/fields/${COLLECTION}`, field);
  }

  const content = JSON.parse(
    readFileSync(
      new URL("../src/app/home/content.default.json", import.meta.url),
      "utf8",
    ),
  );
  await api("PATCH", `/items/${COLLECTION}`, content);

  const readPolicy = await api("POST", "/policies", {
    name: "Front (lecture)",
    icon: "visibility",
    app_access: false,
    admin_access: false,
  });
  for (const collection of [COLLECTION, "directus_versions"]) {
    await api("POST", "/permissions", {
      policy: readPolicy.id,
      collection,
      action: "read",
      fields: ["*"],
    });
  }
  const frontToken = randomBytes(24).toString("hex");
  await api("POST", "/users", {
    first_name: "Site",
    last_name: "Confessio",
    email: "front@example.com",
    token: frontToken,
    policies: [{ policy: readPolicy.id }],
  });

  const editPolicy = await api("POST", "/policies", {
    name: "Rédaction",
    icon: "edit",
    app_access: true,
    admin_access: false,
  });
  const editPermissions = [
    [COLLECTION, ["read", "update"]],
    ["directus_versions", ["create", "read", "update", "delete"]],
    ["directus_revisions", ["read"]],
    ["directus_activity", ["read"]],
  ];
  for (const [collection, actions] of editPermissions) {
    for (const action of actions) {
      await api("POST", "/permissions", {
        policy: editPolicy.id,
        collection,
        action,
        fields: ["*"],
      });
    }
  }
  await api("POST", "/roles", {
    name: "Rédaction",
    icon: "edit",
    policies: [{ policy: editPolicy.id }],
  });

  const flow = await api("POST", "/flows", {
    name: "Mettre à jour le site",
    icon: "sync",
    status: "active",
    trigger: "event",
    accountability: "activity",
    options: {
      type: "action",
      scope: ["items.create", "items.update"],
      collections: [COLLECTION],
    },
  });
  const operation = await api("POST", "/operations", {
    flow: flow.id,
    name: "Revalider la page d'accueil",
    key: "revalidate",
    type: "request",
    position_x: 19,
    position_y: 1,
    options: {
      method: "POST",
      url: `${FRONT_INTERNAL_URL}/api/revalidate-home`,
      headers: [{ header: "Authorization", value: `Bearer ${WEBHOOK_SECRET}` }],
    },
  });
  await api("PATCH", `/flows/${flow.id}`, { operation: operation.id });

  console.log(`CMS_TOKEN=${frontToken}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
