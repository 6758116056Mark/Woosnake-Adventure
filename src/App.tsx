/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SnakeGame } from './game/SnakeGame';

export default function App() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-[#090d16]">
      <SnakeGame />
    </main>
  );
}
