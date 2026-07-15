package com.shentuji.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.shentuji.app.ui.GalleryRoot
import com.shentuji.app.ui.GalleryViewModel
import com.shentuji.app.ui.theme.ShentujiTheme

class MainActivity : ComponentActivity() {
    private val viewModel: GalleryViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        handleShare(intent)
        setContent {
            ShentujiTheme { GalleryRoot(viewModel) }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleShare(intent)
    }

    private fun handleShare(intent: Intent?) {
        val uris = when (intent?.action) {
            Intent.ACTION_SEND -> listOfNotNull(intent.parcelableUri(Intent.EXTRA_STREAM))
            Intent.ACTION_SEND_MULTIPLE -> intent.parcelableUriList(Intent.EXTRA_STREAM)
            else -> emptyList()
        }
        viewModel.receiveUris(uris)
    }
}

private fun Intent.parcelableUri(key: String): Uri? = if (Build.VERSION.SDK_INT >= 33) {
    getParcelableExtra(key, Uri::class.java)
} else {
    @Suppress("DEPRECATION") getParcelableExtra(key)
}

private fun Intent.parcelableUriList(key: String): List<Uri> = if (Build.VERSION.SDK_INT >= 33) {
    getParcelableArrayListExtra(key, Uri::class.java).orEmpty()
} else {
    @Suppress("DEPRECATION") getParcelableArrayListExtra<Uri>(key).orEmpty()
}
