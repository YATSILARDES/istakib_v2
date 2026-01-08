package com.istakibi.android.model

import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.PropertyName
import com.google.firebase.Timestamp

data class RoutineTask(
    @DocumentId
    val id: String = "",
    val title: String = "",
    val content: String = "",
    val description: String = "",
    val customerName: String? = null,
    val address: String? = null,
    val district: String? = null,
    val phoneNumber: String? = null, // Using phoneNumber to match web interface prop if needed, or mapping from phone
    val assignee: String? = null,
    val assigneeEmail: String? = null,
    val isCompleted: Boolean = false,
    
    // Dates
    val date: String? = null,
    val scheduledDate: Timestamp? = null,
    val createdAt: Timestamp? = null,
    
    val dailyOrder: Int = 0,
    val type: String = "routine" 
)
