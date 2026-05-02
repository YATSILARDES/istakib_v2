package com.istakibi.android.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.istakibi.android.model.StockCombi
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow

class StockRepository {
    private val firestore = FirebaseFirestore.getInstance()
    private val stockCombisCollection = firestore.collection("stock_combis")

    fun getStocks(): Flow<List<StockCombi>> = callbackFlow {
        val subscription = stockCombisCollection
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }

                if (snapshot != null) {
                    val stocks = snapshot.documents.mapNotNull { doc ->
                        doc.toObject(StockCombi::class.java)?.copy(id = doc.id)
                    }
                    trySend(stocks)
                }
            }

        awaitClose { subscription.remove() }
    }

    fun addStock(stock: StockCombi) {
        stockCombisCollection.add(stock)
    }

    fun updateStock(stock: StockCombi) {
        if (stock.id.isNotEmpty()) {
            stockCombisCollection.document(stock.id).set(stock)
        }
    }

    fun deleteStock(stockId: String) {
        stockCombisCollection.document(stockId).delete()
    }
}
