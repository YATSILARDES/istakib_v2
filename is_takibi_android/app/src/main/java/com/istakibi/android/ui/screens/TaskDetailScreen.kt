package com.istakibi.android.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.istakibi.android.model.Task
import com.istakibi.android.viewmodel.DashboardViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskDetailScreen(
    taskId: String,
    onBackClick: () -> Unit,
    viewModel: DashboardViewModel = viewModel()
) {
    val tasks by viewModel.rawTasks.collectAsState()
    val task = tasks.find { it.id == taskId }
    val context = LocalContext.current

    if (task == null) {
        Box(
            modifier = Modifier.fillMaxSize().background(Color(0xFF0F172A)),
            contentAlignment = Alignment.Center
        ) {
            Text("İş bulunamadı veya yükleniyor...", color = Color.White)
            Button(onClick = onBackClick, modifier = Modifier.padding(top = 16.dp)) {
                Text("Geri Dön")
            }
        }
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("İş Detayı", color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Geri", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF0F172A)
                )
            )
        },
        containerColor = Color(0xFF0F172A)
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // Title Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = task.title,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    StatusChip(status = task.status)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Info Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    // Address
                    DetailRow(
                        icon = Icons.Default.LocationOn,
                        text = task.address ?: "Adres Girilmemiş",
                        color = Color(0xFFFFC107) // Amber
                    )
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    // Phone
                    DetailRow(
                        icon = Icons.Default.Call,
                        text = task.phone ?: "Telefon Girilmemiş",
                        color = Color(0xFF10B981) // Emerald
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            
            // Description
            if (!task.jobDescription.isNullOrEmpty()) {
                Text("Açıklama", color = Color.Gray, fontSize = 14.sp, modifier = Modifier.padding(bottom = 8.dp))
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = task.jobDescription,
                        color = Color.White,
                        modifier = Modifier.padding(16.dp)
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Call Button
                if (!task.phone.isNullOrEmpty()) {
                    Button(
                        onClick = {
                            val intent = Intent(Intent.ACTION_DIAL).apply {
                                data = Uri.parse("tel:${task.phone}")
                            }
                            context.startActivity(intent)
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                    ) {
                        Icon(Icons.Default.Call, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Ara")
                    }
                }

                // Map Button
                if (!task.address.isNullOrEmpty()) {
                    Button(
                        onClick = {
                            val uri = Uri.parse("geo:0,0?q=${Uri.encode(task.address)}")
                            val intent = Intent(Intent.ACTION_VIEW, uri)
                            intent.setPackage("com.google.android.apps.maps")
                            if (intent.resolveActivity(context.packageManager) != null) {
                                context.startActivity(intent)
                            } else {
                                // Fallback to browser
                                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/search/?api=1&query=${Uri.encode(task.address)}"))
                                context.startActivity(browserIntent)
                            }
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6))
                    ) {
                        Icon(Icons.Default.LocationOn, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Harita")
                    }
                }
            }
        }
    }
}

@Composable
fun DetailRow(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(8.dp))
        Text(text, color = Color.White, fontSize = 14.sp)
    }
}

@Composable
fun StatusChip(status: String) {
    val (label, color) = when (status) {
        "todo" -> "Yapılacak" to Color.Gray
        "in_progress" -> "İşlemde" to Color.Blue
        "done" -> "Tamamlandı" to Color.Green
        "deposit_paid" -> "Kapora Alındı" to Color(0xFF8B5CF6) // Purple
        "measure_taken" -> "Ölçü Alındı" to Color(0xFFEC4899) // Pink
        "assembly_started" -> "Montaj Başladı" to Color(0xFFF59E0B) // Amber
        "assembly_finished" -> "Montaj Bitti" to Color(0xFF10B981) // Emerald
        "check_completed" -> "Kontrol Edildi" to Color.Cyan
        else -> status to Color.Gray
    }
    
    Surface(
        color = color.copy(alpha = 0.2f),
        shape = RoundedCornerShape(8.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = 0.5f))
    ) {
        Text(
            text = label.uppercase(),
            color = color,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}
