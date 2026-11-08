"""Build the root-hosted site with only the current fingerprinted asset graph."""
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
IMPORT = re.compile(
    r"""(?P<prefix>\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(?P<quote>['"])\./(?P<name>[\w-]+\.js)(?P=quote)"""
)
GENERATED = re.compile(r'[\w-]+\.[a-f0-9]{12}\.(?:js|css)')


def build(root=ROOT):
    names, contents, visiting = {}, {}, set()

    def asset(name):
        if name in names:
            return names[name]
        if name in visiting:
            raise ValueError(f'Circular module dependency: {name}')
        visiting.add(name)
        data = (root / name).read_text(encoding='utf-8-sig').encode('utf-8')
        if name.endswith('.js'):
            def dependency(match):
                quote = match['quote']
                return match['prefix'] + quote + './' + asset(match['name']) + quote

            data = IMPORT.sub(dependency, data.decode('utf-8-sig')).encode('utf-8')
        source = Path(name)
        target = f'{source.stem}.{hashlib.sha256(data).hexdigest()[:12]}{source.suffix}'
        names[name], contents[target] = target, data
        visiting.remove(name)
        return target

    # Validate the entire graph before changing published files.
    bootstrap, css = asset('bootstrap.js'), asset('style.css')
    html = (root / 'templates' / 'index.html').read_text(encoding='utf-8-sig')
    for source, target in [('bootstrap.js', bootstrap), ('style.css', css)]:
        if html.count(f'"{source}"') != 1:
            raise ValueError(f'Template must reference {source} exactly once')
        html = html.replace(f'"{source}"', f'"assets/{target}"')

    output = root / 'assets'
    output.mkdir(exist_ok=True)
    for target, data in contents.items():
        (output / target).write_bytes(data)
    temporary = root / 'index.html.tmp'
    temporary.write_text(html, encoding='utf-8', newline='\n')
    temporary.replace(root / 'index.html')

    # Never remove sources or unrelated assets.
    for directory in (root, output):
        for path in directory.iterdir():
            if path.is_file() and GENERATED.fullmatch(path.name):
                if directory == root or path.name not in contents:
                    path.unlink()
    return names


if __name__ == '__main__':
    names = build()
    print(f'Built index.html and {len(names)} current assets in assets/')
