// The HTML is sanitized by getHomeContent before it reaches this component.
export function FaqAnswer({ html }: { html: string }) {
  return (
    <div
      className="tabular pb-6 flex flex-col gap-3 max-w-[620px] text-[15px] md:text-[16px] leading-relaxed text-ink [&_h4]:pt-2 [&_h4]:text-[15px] md:[&_h4]:text-[16px] [&_h4]:font-semibold [&_h4]:text-deepblue [&_ul]:list-disc [&_ol]:list-decimal [&_ul,&_ol]:pl-5 [&_ul,&_ol]:flex [&_ul,&_ol]:flex-col [&_ul,&_ol]:gap-1.5 [&_a]:text-deepblue [&_a]:underline [&_a]:underline-offset-2"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
