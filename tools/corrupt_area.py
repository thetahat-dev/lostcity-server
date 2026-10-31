#!/usr/bin/env python3
"""Spread corruption over a circle of map tiles.

Swaps grass floors and trees for their corrupted versions in content/maps.
The result depends only on the arguments, and already corrupted tiles are left
alone, so areas can be grown by running this again with a larger radius.

Usage: corrupt_area.py <world x> <world z> <radius>
"""

import math
import os
import random
import re
import sys

MAPS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'content', 'maps')
PACK = os.path.join(MAPS, '..', 'pack')

# grassland, muddygrass, vmuddygrass, lightgrass, mud1, mud2
GRASS_FLOORS = {'grassland', 'muddygrass', 'vmuddygrass', 'lightgrass', 'mud1', 'mud2'}
# Outermost tier first. Each covers tiles up to this fraction of the radius.
FLOOR_TIERS = [(1.0, 'corrupt_edge'), (0.7, 'corrupt_mid'), (0.4, 'corrupt_core')]
TREES = {'tree': 'corrupted_tree', 'tree2': 'corrupted_tree2'}
DEAD_TREE = 'deadtree1'
DEAD_TREE_CHANCE = 0.5


def load_pack(name):
    ids = {}
    with open(os.path.join(PACK, f'{name}.pack')) as f:
        for line in f:
            if '=' in line:
                i, n = line.strip().split('=', 1)
                ids[n] = int(i)
    return ids


def strength(x, z, cx, cz, radius):
    """How deep a tile is inside the area, from 0 at the edge to 1 at the center."""
    wobble = math.sin(x * 0.45) * math.cos(z * 0.37) + 0.5 * math.sin((x + z) * 0.9)
    return 1 - (math.hypot(x - cx, z - cz) + wobble * radius * 0.12) / radius


def tile_random(x, z):
    return random.Random(x * 100003 + z)


def corrupt_map(path, mx, mz, cx, cz, radius, flo, loc):
    # Maps name underlays by flo ID + 1.
    grass = {flo[n] + 1 for n in GRASS_FLOORS}
    tiers = [(1 - fraction, flo[n] + 1) for fraction, n in FLOOR_TIERS]
    trees = {loc[a]: loc[b] for a, b in TREES.items()}

    section = None
    floors = trees_changed = 0
    out = []
    with open(path, newline='') as f:
        for line in f:
            if line.startswith('===='):
                section = line.strip('= \r\n')
                out.append(line)
                continue

            match = re.match(r'(\d+) (\d+) (\d+): (.*)', line) if section in ('MAP', 'LOC') else None
            if not match or match[1] != '0':
                out.append(line)
                continue

            x, z = mx * 64 + int(match[2]), mz * 64 + int(match[3])
            depth = strength(x, z, cx, cz, radius)
            if depth < 0:
                out.append(line)
                continue

            if section == 'MAP':
                def swap(m):
                    nonlocal floors
                    if int(m[1]) not in grass:
                        return m[0]
                    floors += 1
                    return f'u{[u for start, u in tiers if depth >= start][-1]}'

                line = re.sub(r'\bu(\d+)', swap, line)
            else:
                parts = match[4].split(' ')
                # Healthy trees thin out moving inward, so the edge isn't a hard line.
                if int(parts[0]) in trees and tile_random(x, z).random() < depth / tiers[1][0]:
                    deep = depth >= tiers[-1][0]
                    dead = deep and tile_random(z, x).random() < DEAD_TREE_CHANCE
                    parts[0] = str(loc[DEAD_TREE] if dead else trees[int(parts[0])])
                    trees_changed += 1
                    line = f'{match[1]} {match[2]} {match[3]}: {" ".join(parts)}' + ('\r\n' if line.endswith('\r\n') else '\n')

            out.append(line)

    if floors or trees_changed:
        with open(path, 'w', newline='') as f:
            f.writelines(out)
    return floors, trees_changed


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    cx, cz, radius = int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3])
    flo, loc = load_pack('flo'), load_pack('loc')

    for name in sorted(os.listdir(MAPS)):
        match = re.fullmatch(r'm(\d+)_(\d+)\.jm2', name)
        if not match:
            continue
        mx, mz = int(match[1]), int(match[2])
        # Wobble can push a tile slightly past the radius.
        reach = radius * 1.3
        if mx * 64 > cx + reach or (mx + 1) * 64 < cx - reach or mz * 64 > cz + reach or (mz + 1) * 64 < cz - reach:
            continue
        floors, trees = corrupt_map(os.path.join(MAPS, name), mx, mz, cx, cz, radius, flo, loc)
        print(f'{name}: {floors} floor tiles, {trees} trees')


if __name__ == '__main__':
    main()
