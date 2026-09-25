package expo.modules.stickerprovider

import android.content.ContentProvider
import android.content.ContentValues
import android.content.UriMatcher
import android.content.res.AssetFileDescriptor
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import java.io.FileNotFoundException

class StickerContentProvider : ContentProvider() {
  private lateinit var authority: String
  private lateinit var repo: PackRepository
  private val matcher = UriMatcher(UriMatcher.NO_MATCH)

  override fun onCreate(): Boolean {
    val ctx = context ?: return false
    authority = authorityFor(ctx.packageName)
    repo = PackRepository(ctx.filesDir)
    matcher.addURI(authority, ProviderContract.METADATA, CODE_METADATA)
    matcher.addURI(authority, "${ProviderContract.METADATA}/*", CODE_METADATA_SINGLE)
    matcher.addURI(authority, "${ProviderContract.STICKERS}/*", CODE_STICKERS)
    matcher.addURI(authority, "${ProviderContract.STICKERS_ASSET}/*/*", CODE_ASSET)
    return true
  }

  override fun query(
    uri: Uri,
    projection: Array<out String>?,
    selection: String?,
    selectionArgs: Array<out String>?,
    sortOrder: String?,
  ): Cursor {
    val cursor = when (matcher.match(uri)) {
      CODE_METADATA -> packCursor(repo.all())
      CODE_METADATA_SINGLE -> packCursor(listOfNotNull(repo.load(uri.lastPathSegment.orEmpty())))
      CODE_STICKERS -> MatrixCursor(ProviderContract.STICKER_COLUMNS).also { c ->
        repo.load(uri.lastPathSegment.orEmpty())?.let { pack -> ProviderContract.stickerRows(pack).forEach(c::addRow) }
      }
      else -> throw IllegalArgumentException("Unknown URI: $uri")
    }
    context?.let { cursor.setNotificationUri(it.contentResolver, uri) }
    return cursor
  }

  private fun packCursor(packs: List<ProviderPack>) =
    MatrixCursor(ProviderContract.PACK_COLUMNS).also { c -> packs.forEach { c.addRow(ProviderContract.packRow(it)) } }

  override fun openAssetFile(uri: Uri, mode: String): AssetFileDescriptor {
    if (!ProviderContract.isReadOnlyMode(mode)) throw FileNotFoundException(uri.toString())
    val segments = uri.pathSegments
    if (matcher.match(uri) != CODE_ASSET || segments.size != 3) throw FileNotFoundException(uri.toString())
    val file = repo.file(segments[1], segments[2]) ?: throw FileNotFoundException(uri.toString())
    return AssetFileDescriptor(ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY), 0, file.length())
  }

  override fun getType(uri: Uri): String? = when (matcher.match(uri)) {
    CODE_METADATA -> "vnd.android.cursor.dir/vnd.$authority.${ProviderContract.METADATA}"
    CODE_METADATA_SINGLE -> "vnd.android.cursor.item/vnd.$authority.${ProviderContract.METADATA}"
    CODE_STICKERS -> "vnd.android.cursor.dir/vnd.$authority.${ProviderContract.STICKERS}"
    CODE_ASSET -> if (uri.lastPathSegment.orEmpty().endsWith(".png")) "image/png" else "image/webp"
    else -> null
  }

  override fun insert(uri: Uri, values: ContentValues?): Uri = throw UnsupportedOperationException()
  override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = throw UnsupportedOperationException()
  override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int =
    throw UnsupportedOperationException()

  companion object {
    private const val CODE_METADATA = 1
    private const val CODE_METADATA_SINGLE = 2
    private const val CODE_STICKERS = 3
    private const val CODE_ASSET = 4

    fun authorityFor(packageName: String) = "$packageName.stickercontentprovider"
  }
}
