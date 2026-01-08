package com.istakibi.android.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.PropertyName

data class Task(
    @DocumentId
    val id: String = "",

    @PropertyName("title")
    val title: String = "",

    @PropertyName("jobDescription")
    val jobDescription: String? = null,

    @PropertyName("status")
    val status: String = "",

    @PropertyName("assignee")
    val assignee: String? = null,

    @PropertyName("assigneeEmail")
    val assigneeEmail: String? = null,

    @PropertyName("address")
    val address: String? = null,

    @PropertyName("district")
    val district: String? = null,

    @PropertyName("city")
    val city: String? = null,

    @PropertyName("phone")
    val phone: String? = null,

    @PropertyName("date")
    val date: String? = null, // Legacy string date

    @PropertyName("scheduledDate")
    val scheduledDate: Timestamp? = null,

    @PropertyName("createdAt")
    val createdAt: Timestamp? = null,

    @PropertyName("checkStatus")
    val checkStatus: String? = null, // "clean", "missing", or null

    @PropertyName("isProjectDrawn")
    val isProjectDrawn: Boolean = false,

    @PropertyName("orderNumber")
    val orderNumber: Int = 0
)
