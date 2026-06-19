import { io } from 'socket.io-client';

export const socket = io({ autoConnect: true, reconnectionDelay: 1000 });
socket.emit('subscribe');
socket.on('connect', () => socket.emit('subscribe'));
