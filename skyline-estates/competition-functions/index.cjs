'use strict';
const {onRequest}=require('firebase-functions/v2/https');
const {initializeApp,getApps}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getDatabase}=require('firebase-admin/database');
const {composeCompetition}=require('./runtime/competition/compose.cjs');
const app=getApps()[0]||initializeApp({projectId:'eko-estates',databaseURL:'https://eko-estates-default-rtdb.europe-west1.firebasedatabase.app'});
const service=composeCompetition({db:getDatabase(app),verifyIdToken:(token,revoked)=>getAuth(app).verifyIdToken(token,revoked)});
exports.skylineCompetition=onRequest({region:'europe-west1',minInstances:0,maxInstances:3,concurrency:10,timeoutSeconds:30,memory:'256MiB'},service.handler);
