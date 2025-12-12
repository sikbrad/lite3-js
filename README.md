# Lite3-JS

A JavaScript implementation of the Lite3 binary serialization format.

> **Note:** This code was translated from [fastserial/lite3](https://github.com/fastserial/lite3) with Claude Code 4.5.

## Overview

Lite3 is a JSON-compatible zero-copy serialization format that encodes data as a B-tree inside a single contiguous buffer, allowing access and mutation on any arbitrary field in O(log n) time.

## Quick Start

```javascript
import Lite3 from 'lite3';

const lite3 = new Lite3();
lite3.initObject();

lite3.set('event', 'lap_complete');
lite3.set('lap', 55);
lite3.set('time_sec', 88.427);

console.log(lite3.toJSON());
// { event: 'lap_complete', lap: 55, time_sec: 88.427 }
```

## Installation

```bash
npm install lite3
```

## License

MIT License
