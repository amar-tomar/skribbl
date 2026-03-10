import { io } from 'socket.io-client';

// Create socket connection OUTSIDE component
// (so it doesn't reconnect on every render)
const socket = io('https://skribbl-tnal.onrender.com/');
export default socket;
