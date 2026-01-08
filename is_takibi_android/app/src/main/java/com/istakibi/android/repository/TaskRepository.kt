package com.istakibi.android.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.snapshots
import com.istakibi.android.model.Task
import com.istakibi.android.model.RoutineTask
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await

class TaskRepository {
    private val firestore = FirebaseFirestore.getInstance()
    private val tasksCollection = firestore.collection("tasks")
    private val routineTasksCollection = firestore.collection("routineTasks")
    private val usersCollection = firestore.collection("users")

    fun getTasks(): Flow<List<Task>> {
        return tasksCollection
            // .orderBy("orderNumber", Query.Direction.ASCENDING) // Geçici olarak kapattık (Index hatası ihtimaline karşı)
            .snapshots()
            .map { snapshot ->
                snapshot.documents.mapNotNull { doc ->
                    try {
                        doc.toObject(Task::class.java)
                    } catch (e: Exception) {
                        e.printStackTrace()
                        null
                    }
                }
            }
    }

    fun getRoutineTasks(): Flow<List<RoutineTask>> {
        return routineTasksCollection
            .snapshots()
            .map { snapshot ->
                snapshot.documents.mapNotNull { doc ->
                    try {
                        doc.toObject(RoutineTask::class.java)
                    } catch (e: Exception) {
                        e.printStackTrace()
                        null
                    }
                }
            }
    }

    suspend fun getUserRole(email: String): String? {
        return try {
            val query = usersCollection.whereEqualTo("email", email).get().await()
            if (!query.isEmpty) {
                query.documents[0].getString("role")
            } else {
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
