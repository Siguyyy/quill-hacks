# Changelog

## [2.3.0] - 2026-11-11

### Added

- Grammar activity route detection for `/grammar/#/play/...` URLs.
- Grammar activity API loading through the `lesson_type=grammar_activity` parameter.
- Context-aware autofill for Grammar questions with one or multiple blanks.
- Ordered multi-blank extraction, including repeated answers and punctuation-sensitive options such as `, and`.
- Active-question input matching so multi-blank values are written to the correct visible fields.
- HTML entity normalization for prompts containing encoded apostrophes and quotation marks.
- Automated answer-extraction and generated-bookmarklet syntax tests.

### Fixed

- Generated bookmarklet syntax failure caused by a missing statement separator after `refreshActiveQuestion`.
- Grammar autofill failures caused by comparing encoded prompt text such as `they&#x27;re` with normal answer text such as `they're`.
- Single-blank extraction incorrectly rejecting valid answers when Quill formatting differed slightly from the completed response.

### Documentation

- Documented Grammar routes, API behavior, single- and multi-blank autofill, and the local test/build workflow.
- Kept the standalone bookmarklet as the recommended installation method; the CDN loader remains documented as requiring temporary CSP disabling on current Quill pages.
