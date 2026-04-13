"use client";

import dynamic from "next/dynamic";

/**
 * Main page — Dynamically loading the Chat component
 * (WebSockets require a browser environment, not an SSR)
 */
const ChatApp = dynamic(() => import("@/components/ChatApp"), { ssr: false });

export default function Home() {
  return <ChatApp />;
}
