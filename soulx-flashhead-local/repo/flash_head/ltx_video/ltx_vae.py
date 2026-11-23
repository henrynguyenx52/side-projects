import logging
import torch
from flash_head.ltx_video.models.autoencoders.causal_video_autoencoder import CausalVideoAutoencoder


class _SuppressFP32Warning(logging.Filter):
    """Suppress the spurious 'should be kept in float32' warning from diffusers.

    The warning fires on ANY .to(dtype) call because of a bug in diffusers'
    ModelMixin.to(): fp32_modules = self._keep_in_fp32_modules or []  converts
    the class default None to an empty list [], then checks 'fp32_modules is not
    None' which is always True for a list.  The list is empty for this model, so
    there is nothing to protect — the warning is pure noise.
    """
    def filter(self, record):
        return "should be kept in float32" not in record.getMessage()


class LtxVAE:
    def __init__(
        self,
        pretrained_model_type_or_path,
        dtype = torch.bfloat16,
        device = "cuda",
    ):
        # Suppress the noise during from_pretrained + .to(dtype)
        modeling_logger = logging.getLogger("diffusers.models.modeling_utils")
        filt = _SuppressFP32Warning()
        modeling_logger.addFilter(filt)
        try:
            self.model = CausalVideoAutoencoder.from_pretrained(
                pretrained_model_type_or_path, torch_dtype=dtype
            ).eval().requires_grad_(False).to(device)
        finally:
            modeling_logger.removeFilter(filt)

    # torch.Size([1, 3, 33, 512, 512]) -> torch.Size([128, 5, 16, 16])
    def encode(self, video):
        latents = self.model.encode(video, return_dict=False)[0].sample()
        out = self.normalize_latents(latents)
        return out[0]

    # torch.Size([128, 5, 16, 16]) -> torch.Size([1, 3, 33, 512, 512])
    def decode(self, zs):
        latents = zs.unsqueeze(0)
        image = self.model.decode(
            self.un_normalize_latents(latents),
            return_dict=False,
            target_shape=latents.shape,
        )[0]
        return image
    
    def normalize_latents(self, latents):
        return (
            (latents - self.model.mean_of_means.to(latents.dtype).view(1, -1, 1, 1, 1))
            / self.model.std_of_means.to(latents.dtype).view(1, -1, 1, 1, 1)
        )


    def un_normalize_latents(self,latents):
        return (
            latents * self.model.std_of_means.to(latents.dtype).view(1, -1, 1, 1, 1)
            + self.model.mean_of_means.to(latents.dtype).view(1, -1, 1, 1, 1)
        )
