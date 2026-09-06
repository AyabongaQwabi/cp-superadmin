'use client';

import { useEffect } from 'react';
import Hotjar from '@hotjar/browser';

const siteId = 6774279;
const hotjarVersion = 6;

export function HotjarAnalytics() {
  useEffect(() => {
    Hotjar.init(siteId, hotjarVersion);
  }, []);

  return null;
}
