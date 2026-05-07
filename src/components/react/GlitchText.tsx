interface Props {
  text: string;
}

export default function GlitchText({ text }: Props) {
  return (
    <div className="text-center py-16">
      <p className="text-2xl font-mono text-neon-cyan animate-pulse tracking-wider">
        ~~ {text} ~~
      </p>
      <p className="text-sm text-text-secondary mt-3 font-mono">
        &lt; SYSTEM_ERROR /&gt;
      </p>
    </div>
  );
}
