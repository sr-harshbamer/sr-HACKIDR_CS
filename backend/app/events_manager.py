"""
Events Manager: Real-Time Event Dispatcher and WebSocket Hub for Guardian.
Broadcasts security events to connected web dashboards and mobile shields.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Set
from fastapi import WebSocket

logger = logging.getLogger("guardian.events")


class EventsManager:
    """Manages WebSocket connections and publishes live security events."""

    def __init__(self):
        self._active_connections: Set[WebSocket] = set()
        self._event_history: List[Dict[str, Any]] = []
        self._max_history = 50

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total active: {len(self._active_connections)}")
        
        # Send recent history snapshot on connect
        if self._event_history:
            await websocket.send_json({
                "type": "HISTORY_SNAPSHOT",
                "data": self._event_history[-15:],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    def disconnect(self, websocket: WebSocket) -> None:
        self._active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total active: {len(self._active_connections)}")

    async def broadcast_event(self, event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Broadcasts an event to all connected listeners."""
        event_obj = {
            "id": f"evt_{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "type": event_type,
            "data": payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Save to ring buffer
        self._event_history.append(event_obj)
        if len(self._event_history) > self._max_history:
            self._event_history.pop(0)

        # Broadcast concurrently
        if self._active_connections:
            message_text = json.dumps(event_obj)
            dead_sockets = set()
            for ws in self._active_connections:
                try:
                    await ws.send_text(message_text)
                except Exception:
                    dead_sockets.add(ws)
            for ws in dead_sockets:
                self._active_connections.discard(ws)

        return event_obj

    def get_recent_events(self, limit: int = 20) -> List[Dict[str, Any]]:
        return self._event_history[-limit:]


# Global singleton instance
events_hub = EventsManager()
