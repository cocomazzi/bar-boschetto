"""Regression checks for the published asset graph; no remote services required."""
import hashlib
import importlib.util
from pathlib import Path
import re
import shutil
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_assets', ROOT / 'scripts/build-assets.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='tmp-build-', dir=ROOT)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for path in ROOT.glob('*.js'):
            if not builder.GENERATED.fullmatch(path.name):
                shutil.copy2(path, self.root / path.name)
        shutil.copy2(ROOT / 'style.css', self.root / 'style.css')
        shutil.copytree(ROOT / 'templates', self.root / 'templates')

    def snapshot(self):
        return {str(p.relative_to(self.root)): p.read_bytes()
                for p in self.root.rglob('*') if p.is_file()}

    def test_published_graph_is_closed_and_contains_unchanged_source_logic(self):
        names = builder.build(self.root)
        output = self.root / 'assets'
        self.assertEqual(len(names), 13)
        self.assertEqual({p.name for p in output.iterdir()}, set(names.values()))
        for source, target in names.items():
            data = (output / target).read_bytes()
            self.assertIn(hashlib.sha256(data).hexdigest()[:12], target)
            if source.endswith('.js'):
                text = data.decode('utf-8')
                # Every dependency reference must be fingerprinted and present.
                for dependency in re.findall(r'''(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]\./([\w.-]+\.js)['"]''', text):
                    self.assertIn(dependency, names.values())
                    self.assertTrue((output / dependency).is_file())
                for original, generated in names.items():
                    text = text.replace('./' + generated, './' + original)
                self.assertEqual(text, (self.root / source).read_text(encoding='utf-8-sig'))
        html = (self.root / 'index.html').read_text(encoding='utf-8')
        self.assertIn('assets/' + names['bootstrap.js'], html)
        self.assertIn('assets/' + names['style.css'], html)

    def test_repeat_build_is_byte_identical(self):
        builder.build(self.root)
        before = self.snapshot()
        builder.build(self.root)
        self.assertEqual(before, self.snapshot())

    def test_leaf_change_updates_parents_and_removes_only_old_generated_files(self):
        old = builder.build(self.root)
        (self.root / 'assets' / 'keep.txt').write_text('keep')
        legacy = self.root / 'app.000000000000.js'
        legacy.write_text('obsolete')
        with (self.root / 'supabase-config.js').open('a', encoding='utf-8') as file:
            file.write('\n// new public configuration\n')
        new = builder.build(self.root)
        for source in ('supabase-config.js', 'supabase-backend.js', 'storage.js', 'app.js', 'bootstrap.js'):
            self.assertNotEqual(old[source], new[source])
        self.assertEqual(old['style.css'], new['style.css'])
        self.assertFalse(legacy.exists())
        self.assertTrue((self.root / 'assets' / 'keep.txt').exists())
        for target in set(old.values()) - set(new.values()):
            self.assertFalse((self.root / 'assets' / target).exists())

    def test_broken_dependency_does_not_change_published_files(self):
        builder.build(self.root)
        (self.root / 'shopping-model.js').unlink()
        before = self.snapshot()
        with self.assertRaises(FileNotFoundError):
            builder.build(self.root)
        self.assertEqual(before, self.snapshot())


if __name__ == '__main__':
    unittest.main()
