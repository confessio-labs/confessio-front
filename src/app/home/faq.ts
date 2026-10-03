// Every answer is quoted verbatim from official Church texts (vatican.va).
// Do not paraphrase or add wording of our own.

export type FaqEntry = {
  question: string;
  answer: string;
  source: string;
  href: string;
};

export const FAQ: FaqEntry[] = [
  {
    question: "Qu'est-ce que la confession ?",
    answer:
      "« Ceux qui s'approchent du sacrement de Pénitence y reçoivent de la miséricorde de Dieu le pardon de l'offense qu'ils lui ont faite et du même coup sont réconciliés avec l'Église que leur péché a blessée et qui, par la charité, l'exemple, les prières, travaille à leur conversion. »",
    source: "CEC §1422",
    href: "https://www.vatican.va/archive/FRA0013/__P41.HTM",
  },
  {
    question: "Ai-je le droit de me confesser ? Est-ce pour moi ?",
    answer:
      "Le Christ a institué le sacrement de Pénitence pour tous les membres pécheurs de son Église, avant tout pour ceux qui, après le baptême, sont tombés dans le péché grave et qui ont ainsi perdu la grâce baptismale et blessé la communion ecclésiale. C'est à eux que le sacrement de Pénitence offre une nouvelle possibilité de se convertir et de retrouver la grâce de la justification. Les Pères de l'Église présentent ce sacrement comme « la seconde planche [de salut] après le naufrage qu'est la perte de la grâce » (Tertullien, pæn. 4, 2 ; cf. Cc. Trente : DS 1542).",
    source: "CEC §1446",
    href: "https://www.vatican.va/archive/FRA0013/__P47.HTM",
  },
  {
    question:
      "Que dois-je faire ? Dois-je apporter quelque chose ou me préparer ?",
    answer:
      "Il faut : un sérieux examen de conscience; la contrition (ou repentir), qui est parfaite quand elle est motivée par l'amour envers Dieu, et imparfaite quand elle est fondée sur d'autres motifs et qu'elle inclut le propos de ne plus pécher; la confession, qui consiste dans l'aveu des péchés devant le prêtre; la satisfaction, à savoir l'accomplissement de certains actes de pénitence que le confesseur impose au pénitent, afin de réparer le dommage causé par le péché.",
    source: "Compendium n° 303",
    href: "https://www.vatican.va/archive/compendium_ccc/documents/archive_2005_compendium-ccc_fr.html",
  },
];
