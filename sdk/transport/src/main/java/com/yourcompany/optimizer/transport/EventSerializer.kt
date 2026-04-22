package com.yourcompany.optimizer.transport

import com.yourcompany.optimizer.core.Event
import org.json.JSONObject

/**
 * Serializes events to JSON for transmission
 */
object EventSerializer {
    
    fun serialize(event: Event): String {
        val json = JSONObject()
        json.put("timestamp", event.timestamp)
        json.put("type", event.type)
        
        // Use reflection to serialize all properties
        event.javaClass.declaredFields.forEach { field ->
            field.isAccessible = true
            val value = field.get(event)
            
            when (value) {
                is String, is Number, is Boolean -> json.put(field.name, value)
                is Map<*, *> -> json.put(field.name, JSONObject(value as Map<*, *>))
                is Enum<*> -> json.put(field.name, value.name)
                null -> json.put(field.name, JSONObject.NULL)
            }
        }
        
        return json.toString()
    }
    
    fun serializeBatch(events: List<Event>): String {
        val array = org.json.JSONArray()
        events.forEach { array.put(JSONObject(serialize(it))) }
        return array.toString()
    }
}
