import { test } from 'node:test';
import assert from 'node:assert/strict';
import { browseStepOf, channelStepOf } from '../src/ui/keys.js';

const key = (name) => ({ key: name });

test('▲ and ▼ move the cursor through the channel list, one row up or down', () => {
  assert.equal(browseStepOf(key('ArrowUp')), -1);
  assert.equal(browseStepOf(key('ArrowDown')), 1);
  assert.equal(browseStepOf(key('ArrowLeft')), 0);
  assert.equal(browseStepOf(key('Enter')), 0);
  assert.equal(browseStepOf(key('ChannelUp')), 0, 'CH+ switches channels, it does not browse');
});

test('CH+ and CH- (PageUp and PageDown on a keyboard) switch channels directly', () => {
  assert.equal(channelStepOf(key('ChannelUp')), -1);
  assert.equal(channelStepOf(key('PageUp')), -1);
  assert.equal(channelStepOf(key('ChannelDown')), 1);
  assert.equal(channelStepOf(key('PageDown')), 1);
});

test('the arrows no longer switch channels: they only browse', () => {
  assert.equal(channelStepOf(key('ArrowUp')), 0);
  assert.equal(channelStepOf(key('ArrowDown')), 0);
});
