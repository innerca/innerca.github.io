import { useEffect, useState } from 'react';

interface Props {
  value: number;
  duration?: number;
}

export default function CountUp({ value, duration = 1000 }: Props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let raf: number;

    function animate(time: number) {
      if (startTime === null) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    }

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span>{count}</span>;
}
