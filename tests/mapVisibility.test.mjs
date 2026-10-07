import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleMapProfile, hasOwnerMapView } from '../src/lib/mapVisibility.js';

const owner = {id:'69faa8a3ff7324c96aef6557',role:'admin'};
const member = {id:'member',role:'user'};
const now = Date.parse('2026-10-07T22:00:00Z');
const profile = {location_lat:45.5,location_lng:-122.67,is_online:false,last_active:'2026-10-01T00:00:00Z'};

test('only the identified owner with admin role gets inactive map visibility', () => {
 assert.equal(visibleMapProfile(profile,owner,now).last_active,profile.last_active);
 assert.equal(visibleMapProfile(profile,member,now),null);
 assert.equal(visibleMapProfile(profile,{id:'another-admin',role:'admin'},now),null);
 assert.equal(hasOwnerMapView({...owner,role:'user'}),false);
 assert.equal(hasOwnerMapView(null),false);
});
test('owner view still hides invisible profiles and missing locations', () => {
 assert.equal(visibleMapProfile({...profile,invisible_mode:true},owner,now),null);
 assert.equal(visibleMapProfile({...profile,location_lat:null},owner,now),null);
});
test('ordinary profiles remain for 48 hours with accurate online status', () => {
 const active = {...profile,is_online:true,last_active:'2026-10-07T21:30:00Z'};
 assert.equal(visibleMapProfile(active,member,now).is_online,false);
 assert.ok(visibleMapProfile({...active,is_online:false,last_active:'2026-10-05T22:00:00Z'},member,now));
 assert.equal(visibleMapProfile({...active,last_active:'2026-10-05T21:59:59Z'},member,now),null);
 assert.equal(visibleMapProfile({...active,last_active:'2026-10-07T21:55:00Z'},member,now).is_online,true);
 const privateStatus = {...profile,show_online_status:false};
 assert.equal(visibleMapProfile(privateStatus,member,now).is_online,false);
});
