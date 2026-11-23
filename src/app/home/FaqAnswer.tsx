// French typography: keep guillemets and high punctuation on the same line as
// the word they belong to.
export const bindFrenchSpaces = (text: string) =>
  text.replace(/« /g, "« ").replace(/ ([»:;?!])/g, " $1");

const HEADING = /^##\s+/;
const BULLET = /^-\s+/;
const NUMBERED = /^(\d+)\.\s+/;

function Block({ block }: { block: string }) {
  const lines = block.split("\n");

  if (HEADING.test(block)) {
    return (
      <h4 className="pt-2 text-[15px] md:text-[16px] font-semibold text-deepblue">
        {bindFrenchSpaces(block.replace(HEADING, ""))}
      </h4>
    );
  }

  if (lines.every((line) => BULLET.test(line))) {
    return (
      <ul className="list-disc pl-5 flex flex-col gap-1.5">
        {lines.map((line) => (
          <li key={line}>{bindFrenchSpaces(line.replace(BULLET, ""))}</li>
        ))}
      </ul>
    );
  }

  if (lines.every((line) => NUMBERED.test(line))) {
    return (
      <ol
        start={Number(lines[0]?.match(NUMBERED)?.[1] ?? 1)}
        className="tabular list-decimal pl-5 flex flex-col gap-1.5"
      >
        {lines.map((line) => (
          <li key={line}>{bindFrenchSpaces(line.replace(NUMBERED, ""))}</li>
        ))}
      </ol>
    );
  }

  return <p className="whitespace-pre-line">{bindFrenchSpaces(block)}</p>;
}

export function FaqAnswer({ answer }: { answer: string }) {
  return (
    <div className="pb-6 flex flex-col gap-3 max-w-[620px] text-[15px] md:text-[16px] leading-relaxed text-ink">
      {answer.split("\n\n").map((block) => (
        <Block key={block} block={block} />
      ))}
    </div>
  );
}
