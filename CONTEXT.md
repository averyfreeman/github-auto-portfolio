# Portfolio context

This context describes how public GitHub identity becomes portfolio presentation.

## Profile attributes

**Profile attributes**:
Values used to describe the portfolio owner, including public GitHub metadata and authored portfolio copy.
_Avoid_: user record, account profile

**Profile projection**:
The canonical portfolio-facing representation of supported GitHub profile metadata, with local overrides taking precedence over generated defaults.
_Avoid_: profile sync, raw profile

**Local override**:
An authored profile attribute that takes precedence over generated public metadata, including an intentionally empty value.
_Avoid_: fallback value, replacement

**Supported GitHub field**:
A public GitHub profile value that the portfolio may use as a generated default; unsupported fields do not become portfolio content automatically.
_Avoid_: arbitrary metadata, social scrape

**Pinned repository**:
A public repository intentionally promoted by the owner ahead of the remaining repository list.
_Avoid_: featured repo, highlighted project
