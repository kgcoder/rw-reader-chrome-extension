/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import g from '../reader/Globals.js'
import HostAdapter from './HostAdapter.js'
import '../reader/readerStartUp.js'

// Safe as a plain top-level assignment: nothing in reader/ reads g.hostAdapter until
// the 'initReader' event, which content.js dispatches only after this whole module
// graph (including readerStartUp.js's own imports) has finished loading.
g.hostAdapter = new HostAdapter()
