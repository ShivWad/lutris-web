"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ServiceLogo } from "./service-badge";
import type { LibraryGame } from "@/lib/lutris/types";

function hueFor(value: string) { return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360; }
function tileFor(value: string) { return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 8; }

export function CoverArt({ game, priority = false }: { game: LibraryGame; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const tile = tileFor(game.name);
  const style = { "--cover-hue": hueFor(game.name), "--tile-x": tile % 4, "--tile-y": Math.floor(tile / 4) } as React.CSSProperties;
  useEffect(() => setFailed(false), [game.coverUrl]);
  return (
    <div className="cover-art" style={style}>
      {game.coverUrl && !failed ? <Image src={game.coverUrl} alt="" fill sizes="(max-width: 820px) 33vw, (max-width: 1280px) 16vw, 180px" priority={priority} onError={() => setFailed(true)} /> : (
        <div className="cover-fallback"><ServiceLogo service={game.service} /><span className="cover-monogram">{game.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</span><small>{game.name}</small></div>
      )}
    </div>
  );
}
